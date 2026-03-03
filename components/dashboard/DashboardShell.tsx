'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { COACHES } from '@/lib/coaches'
import { buildSystemPrompt } from '@/lib/prompts'
import { buildContextString, checkExceptions, saveException, saveFoodLog, saveActivityLog, saveWeightLog, summarizeSession } from '@/lib/memory'
import { Header } from './Header'
import { CoachTab } from './CoachTab'
import { ActivityTab } from './ActivityTab'
import { TodayTab } from './TodayTab'
import { HistoryTab } from './HistoryTab'
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
  isError?: boolean
}

export function DashboardShell({ profile, userId, initialFoodLogs, initialActivityLogs, initialWeightLbs, initialWeightHistory }: Props) {
  const router = useRouter()
  const coach = COACHES[profile.coach_id] ?? COACHES.aria

  const [activeTab, setActiveTab] = useState('coach')

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
    document.documentElement.style.setProperty('--fc-coach-gradient', coach.gradient)
  }, [coach.color, coach.gradient])

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

  // Send greeting on first load, checking for expired exception follow-ups
  useEffect(() => {
    async function initGreeting() {
      const triggered = await checkExceptions(userId)

      const MILESTONES = [3, 7, 14, 30, 60, 100]
      const loggingStreak = profile.streaks?.logging ?? 0
      const proteinStreak = profile.streaks?.protein ?? 0
      const streakMilestone = MILESTONES.includes(loggingStreak) ? loggingStreak : null
      const proteinMilestone = MILESTONES.includes(proteinStreak) ? proteinStreak : null

      let streakNote = ''
      if (streakMilestone) streakNote += ` My logging streak just hit ${streakMilestone} days — acknowledge it.`
      if (proteinMilestone) streakNote += ` My protein streak just hit ${proteinMilestone} days — acknowledge it.`

      let greeting: string
      if (triggered.length > 0) {
        const notes = triggered.map(e => `"${e.note}"`).join(' and ')
        const prefix = `Some exceptions just wrapped up: ${notes}.`
        greeting = profile.last_session
          ? `I'm back. ${prefix} Check in on those briefly, then a quick momentum update from recent sessions.${streakNote} 2 sentences total.`
          : `Hi! I'm ${profile.name}. ${prefix} Ask me how they went.`
      } else if (profile.last_session) {
        greeting = `I'm back. Give me a momentum update based on my last few sessions — look at the trend, keep it 2 sentences.${streakNote}`
      } else {
        greeting = `Hi! I'm ${profile.name}. I'm ready to start tracking with you today!`
      }

      sendMessage(greeting, false)
    }
    initGreeting()
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

    setDisplayMessages(prev => [...prev, { role: 'coach', text: '', isLoading: true }])

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

      setDisplayMessages(prev => prev.filter((_, i) => i !== prev.length - 1 || !prev[prev.length - 1]?.isLoading))

      if (!res.ok) {
        setDisplayMessages(prev => [...prev.filter(m => !m.isLoading), { role: 'coach', text: 'Something went wrong. Please try again.', isError: true }])
        setIsLoading(false)
        return
      }

      const data = await res.json()

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
    <div className="fc-shell" style={{ maxWidth: 430, margin: '0 auto', background: 'var(--fc-bg)', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'var(--font-dm-sans)' }}>
      <Header
        coach={coach}
        caloriesEaten={caloriesEaten}
        caloriesBurned={caloriesBurned}
        calorieTarget={profile.calorie_target}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        streaks={profile.streaks}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
        {activeTab === 'coach' && (
          <CoachTab
            coach={coach}
            messages={displayMessages}
            onSend={(text, image) => sendMessage(text, true, image)}
            onActivityLog={handleLogActivity}
          />
        )}
        {activeTab === 'activity' && (
          <ActivityTab
            activityLog={activityLog}
            caloriesBurned={caloriesBurned}
            onLogActivity={handleLogActivity}
            coach={coach}
          />
        )}
        {activeTab === 'today' && (
          <TodayTab
            foodLog={foodLog}
            dailySummary={dailySummary}
            dinnerSuggestion={dinnerSuggestion}
            coach={coach}
            calorieTarget={profile.calorie_target}
            userId={userId}
            weightLbs={weightLbs}
            weightHistory={weightHistory}
            streaks={profile.streaks}
            onWeightSaved={(lbs) => {
              setWeightLbs(lbs)
              const today = new Date().toISOString().split('T')[0]
              setWeightHistory(prev => {
                const filtered = prev.filter(w => w.logged_date !== today)
                return [...filtered, { id: '', user_id: userId, logged_date: today, weight_lbs: lbs, created_at: new Date().toISOString() }]
              })
            }}
          />
        )}
        {activeTab === 'history' && (
          <HistoryTab
            coach={coach}
            userId={userId}
            calorieTarget={profile.calorie_target}
          />
        )}
      </div>

      <div style={{ flexShrink: 0, textAlign: 'center', paddingBottom: 8, background: 'var(--fc-bg)' }}>
        <button
          onClick={handleSignOut}
          style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-dm-sans)' }}
        >
          sign out
        </button>
      </div>
    </div>
  )
}
