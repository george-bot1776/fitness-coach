'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { COACHES } from '@/lib/coaches'
import { buildSystemPrompt } from '@/lib/prompts'
import { buildContextString, saveException, saveFoodLog, saveActivityLog, saveWeightLog, summarizeSession } from '@/lib/memory'
import { Header } from './Header'
import { CoachTab } from './CoachTab'
import { ActivityTab } from './ActivityTab'
import { TodayTab } from './TodayTab'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Profile, FoodLog, ActivityLog, ChatMessage, CoachResponseType, FoodItem, ActivityItem, DailySummary, WeightLog } from '@/types'

interface Props {
  profile: Profile
  userId: string
  initialFoodLogs: FoodLog[]
  initialActivityLogs: ActivityLog[]
  initialWeightLbs: number | null
  initialWeightHistory: WeightLog[]
}

interface DisplayMessage {
  role: 'user' | 'coach'
  text: string
  imageUrl?: string
  isLoading?: boolean
}

export function DashboardShell({ profile, userId, initialFoodLogs, initialActivityLogs, initialWeightLbs, initialWeightHistory }: Props) {
  const router = useRouter()
  const coach = COACHES[profile.coach_id] ?? COACHES.aria

  // Session state
  const [apiMessages, setApiMessages] = useState<ChatMessage[]>([])
  const [displayMessages, setDisplayMessages] = useState<DisplayMessage[]>([])
  const [foodLog, setFoodLog] = useState<FoodItem[]>(
    initialFoodLogs.map(f => ({ name: f.name, calories: f.calories, protein: f.protein, carbs: f.carbs, fat: f.fat }))
  )
  const [activityLog, setActivityLog] = useState<ActivityItem[]>(
    initialActivityLogs.map(a => ({ label: a.label, value: a.value, unit: a.unit, caloriesBurned: a.calories_burned }))
  )
  const [caloriesBurned, setCaloriesBurned] = useState(
    initialActivityLogs.reduce((s, a) => s + a.calories_burned, 0)
  )
  const [dinnerSuggestion, setDinnerSuggestion] = useState<string | null>(null)
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null)
  const [weightLbs, setWeightLbs] = useState<number | null>(initialWeightLbs)
  const [weightHistory, setWeightHistory] = useState<WeightLog[]>(initialWeightHistory)
  const [isLoading, setIsLoading] = useState(false)

  // Apply coach accent CSS variable
  useEffect(() => {
    document.documentElement.style.setProperty('--fc-coach-accent', coach.color)
  }, [coach.color])

  // Session summarization on unload
  useEffect(() => {
    const handleUnload = async () => {
      if (apiMessages.length < 2) return
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        await summarizeSession(userId, apiMessages, session.access_token)
      }
    }
    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [apiMessages, userId])

  // Send greeting on first load
  useEffect(() => {
    const greeting = profile.last_session
      ? `I'm back. Give me a momentum update based on my last few sessions — look at the trend, keep it 2 sentences.`
      : `Hi! I'm ${profile.name}. I'm ready to start tracking with you today!`
    sendMessage(greeting, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const getAccessToken = useCallback(async (): Promise<string> => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ?? ''
  }, [])

  const caloriesEaten = foodLog.reduce((s, f) => s + f.calories, 0)

  async function sendMessage(
    text: string,
    showUserBubble = true,
    image?: { base64: string; mediaType: string; previewUrl: string }
  ) {
    if (!text && !image) return
    setIsLoading(true)

    if (showUserBubble) {
      setDisplayMessages(prev => [...prev, { role: 'user', text, imageUrl: image?.previewUrl }])
    }

    // Loading indicator
    const loadingId = Date.now()
    setDisplayMessages(prev => [...prev, { role: 'coach', text: '', isLoading: true }])

    // Build content
    const content: ChatMessage['content'] = []
    if (image) {
      content.push({ type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.base64 } })
    }
    if (text) content.push({ type: 'text', text })

    const userMessage: ChatMessage = {
      role: 'user',
      content: content.length === 1 && 'text' in content[0] ? (content[0].text ?? text) : content,
    }

    const updatedMessages = [...apiMessages, userMessage]

    // Strip image data from older messages to keep history lightweight
    // Only the most recent image message needs the actual bytes
    const trimmedMessages = updatedMessages.map((msg, idx) => {
      if (idx === updatedMessages.length - 1) return msg
      if (typeof msg.content === 'string') return msg
      const hasImage = msg.content.some(b => b.type === 'image')
      if (!hasImage) return msg
      const textOnly = msg.content.filter(b => b.type === 'text')
      return { role: msg.role, content: textOnly.length ? textOnly : [{ type: 'text' as const, text: '[food photo]' }] }
    })

    setApiMessages(updatedMessages)

    const contextString = await buildContextString(userId)
    const system = buildSystemPrompt(coach, profile, contextString, {
      caloriesEaten,
      caloriesBurned,
      proteinEaten: Math.round(foodLog.reduce((s, f) => s + f.protein, 0)),
      foodsLogged: foodLog.map(f => f.name).join(', '),
      activitiesLogged: activityLog.map(a => a.label).join(', '),
    })

    const token = await getAccessToken()

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messages: trimmedMessages, system }),
      })

      // Remove loading bubble
      setDisplayMessages(prev => prev.filter((_, i) => i !== prev.length - 1 || !prev[prev.length-1]?.isLoading))

      if (!res.ok) {
        setDisplayMessages(prev => [...prev.filter(m => !m.isLoading), { role: 'coach', text: 'Something went wrong. Please try again.', isError: true } as DisplayMessage])
        setIsLoading(false)
        return
      }

      const data = await res.json()

      // Handle blocked
      if (data.blocked) {
        setDisplayMessages(prev => [...prev.filter(m => !m.isLoading), { role: 'coach', text: data.message }])
        setApiMessages(prev => [...prev, { role: 'assistant', content: data.message }])
        setIsLoading(false)
        return
      }

      const raw = data.content?.[0]?.text?.trim() ?? '{"type":"chat","message":"Sorry, I had trouble responding."}'
      const clean = raw.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim()

      let parsed: CoachResponseType
      try {
        parsed = JSON.parse(clean)
      } catch {
        parsed = { type: 'chat', message: raw }
      }

      setApiMessages(prev => [...prev, { role: 'assistant', content: raw }])
      await handleCoachResponse(parsed)

    } catch {
      setDisplayMessages(prev => [...prev.filter(m => !m.isLoading), { role: 'coach', text: 'Connection error. Please try again.' }])
    } finally {
      setIsLoading(false)
    }

    void loadingId
  }

  async function handleCoachResponse(parsed: CoachResponseType) {
    if ('blocked' in parsed) {
      setDisplayMessages(prev => [...prev.filter(m => !m.isLoading), { role: 'coach', text: parsed.message }])
      return
    }

    setDisplayMessages(prev => [...prev.filter(m => !m.isLoading), { role: 'coach', text: parsed.message }])

    if (parsed.type === 'food_log' && parsed.food) {
      const food = parsed.food
      setFoodLog(prev => [...prev, food])
      await saveFoodLog(userId, food)
      if (parsed.dinnerSuggestion) setDinnerSuggestion(parsed.dinnerSuggestion)
    }

    if (parsed.type === 'activity_log' && parsed.activity) {
      const act = parsed.activity
      setActivityLog(prev => [...prev, act])
      setCaloriesBurned(prev => prev + (act.caloriesBurned ?? 0))
      await saveActivityLog(userId, { label: act.label, value: act.value, unit: act.unit, calories_burned: act.caloriesBurned })
    }

    if (parsed.type === 'weight_log' && parsed.weight) {
      const lbs = parsed.weight.lbs
      setWeightLbs(lbs)
      const today = new Date().toISOString().split('T')[0]
      setWeightHistory(prev => {
        const filtered = prev.filter(w => w.logged_date !== today)
        return [...filtered, { id: '', user_id: userId, logged_date: today, weight_lbs: lbs, created_at: new Date().toISOString() }]
      })
      await saveWeightLog(userId, lbs)
    }

    if (parsed.type === 'exception' && parsed.exception) {
      const ex = parsed.exception
      await saveException(userId, ex.note, ex.expires, ex.followUp)
    }

    if (parsed.type === 'daily_summary' && parsed.summary) {
      setDailySummary(parsed.summary)
    }
  }

  function handleLogActivity(text: string) {
    sendMessage(text, true)
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="flex flex-col max-w-[430px] mx-auto overflow-hidden fc-shell"
         style={{ background: 'var(--fc-bg)' }}>
      <Header
        coach={coach}
        caloriesEaten={caloriesEaten}
        caloriesBurned={caloriesBurned}
        calorieTarget={profile.calorie_target}
      />

      <Tabs defaultValue="coach" className="flex flex-col flex-1 overflow-hidden">
        <TabsList className="rounded-none border-b shrink-0 h-10 gap-0 p-0"
                  style={{ background: 'var(--fc-surface)', borderColor: 'var(--fc-border)' }}>
          {['coach', 'activity', 'today'].map(tab => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="flex-1 rounded-none text-xs font-semibold capitalize h-full data-[state=active]:shadow-none"
              style={{ color: 'var(--fc-text-dim)' }}
            >
              {tab === 'coach' ? 'Coach' : tab === 'activity' ? 'Activity' : 'Today'}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="coach" className="flex flex-col flex-1 overflow-hidden mt-0">
          <CoachTab
            coach={coach}
            messages={displayMessages}
            onSend={(text, image) => sendMessage(text, true, image)}
            onActivityLog={handleLogActivity}
          />
        </TabsContent>

        <TabsContent value="activity" className="flex flex-col flex-1 overflow-hidden mt-0">
          <ActivityTab
            activityLog={activityLog}
            caloriesBurned={caloriesBurned}
            onLogActivity={handleLogActivity}
          />
        </TabsContent>

        <TabsContent value="today" className="flex flex-col flex-1 overflow-hidden mt-0">
          <TodayTab
            foodLog={foodLog}
            dailySummary={dailySummary}
            dinnerSuggestion={dinnerSuggestion}
            coach={coach}
            calorieTarget={profile.calorie_target}
            userId={userId}
            weightLbs={weightLbs}
            weightHistory={weightHistory}
            onWeightSaved={(lbs) => {
              setWeightLbs(lbs)
              const today = new Date().toISOString().split('T')[0]
              setWeightHistory(prev => {
                const filtered = prev.filter(w => w.logged_date !== today)
                return [...filtered, { id: '', user_id: userId, logged_date: today, weight_lbs: lbs, created_at: new Date().toISOString() }]
              })
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Sign out — accessible from bottom of coach tab via long-press not needed, but added as tiny link */}
      <div className="shrink-0 text-center pb-1" style={{ background: 'var(--fc-bg)' }}>
        <button onClick={handleSignOut} className="text-[10px]" style={{ color: 'var(--fc-text-muted)' }}>
          sign out
        </button>
      </div>
    </div>
  )
}
