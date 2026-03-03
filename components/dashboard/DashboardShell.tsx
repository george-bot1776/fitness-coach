'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { COACHES } from '@/lib/coaches'
import { buildSystemPrompt } from '@/lib/prompts'
import { buildContextString, checkExceptions, saveEpisode, saveException, saveFoodLog, saveActivityLog, saveWeightLog, summarizeSession, saveFoodLogForDate, saveActivityLogForDate, updateFoodLog, deleteFoodLog, updateActivityLog, deleteActivityLog } from '@/lib/memory'
import { matchFoodEntry, matchActivityEntry } from '@/lib/entry-matcher'
import { Header } from './Header'
import { CoachTab } from './CoachTab'
import { ActivityTab } from './ActivityTab'
import { TodayTab } from './TodayTab'
import { HistoryTab } from './HistoryTab'
import type { Profile, FoodLog, ActivityLog, ChatMessage, CoachResponseType, DailySummary, WeightLog } from '@/types'

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
  summary?: DailySummary
}

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export function DashboardShell({ profile, userId, initialFoodLogs, initialActivityLogs, initialWeightLbs, initialWeightHistory }: Props) {
  const router = useRouter()
  const coach = COACHES[profile.coach_id] ?? COACHES.aria

  const [activeTab, setActiveTab] = useState('coach')

  // Session state — FoodLog/ActivityLog so we have IDs for edit/delete
  const [apiMessages, setApiMessages] = useState<ChatMessage[]>([])
  const [displayMessages, setDisplayMessages] = useState<DisplayMessage[]>([])
  const [foodLog, setFoodLog] = useState<FoodLog[]>(initialFoodLogs)
  const [activityLog, setActivityLog] = useState<ActivityLog[]>(initialActivityLogs)
  const [caloriesBurned, setCaloriesBurned] = useState(
    initialActivityLogs.reduce((s, a) => s + a.calories_burned, 0)
  )
  const [dinnerSuggestion, setDinnerSuggestion] = useState<string | null>(null)
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null)
  const [weightLbs, setWeightLbs] = useState<number | null>(initialWeightLbs)
  const [weightHistory, setWeightHistory] = useState<WeightLog[]>(initialWeightHistory)
  const [isLoading, setIsLoading] = useState(false)
  // Track which entries were edited this session (for the edited badge)
  const [editedFoodIds, setEditedFoodIds] = useState<Set<string>>(new Set())
  const [editedActivityIds, setEditedActivityIds] = useState<Set<string>>(new Set())

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
      const saved = await saveFoodLog(userId, food)
      if (saved) setFoodLog(prev => [...prev, saved])
      if (parsed.dinnerSuggestion) setDinnerSuggestion(parsed.dinnerSuggestion)
    }

    if (parsed.type === 'activity_log' && parsed.activity) {
      const act = parsed.activity
      const saved = await saveActivityLog(userId, { label: act.label, value: act.value, unit: act.unit, calories_burned: act.caloriesBurned })
      if (saved) {
        setActivityLog(prev => [...prev, saved])
        setCaloriesBurned(prev => prev + (act.caloriesBurned ?? 0))
      }
    }

    if (parsed.type === 'weight_log' && parsed.weight) {
      const { lbs, date } = parsed.weight
      const logDate = date ?? todayStr()
      const isToday = logDate === todayStr()
      if (isToday) setWeightLbs(lbs)
      setWeightHistory(prev => {
        const filtered = prev.filter(w => w.logged_date !== logDate)
        return [...filtered, { id: '', user_id: userId, logged_date: logDate, weight_lbs: lbs, created_at: new Date().toISOString() }]
          .sort((a, b) => a.logged_date.localeCompare(b.logged_date))
      })
      await saveWeightLog(userId, lbs, date)
    }

    if (parsed.type === 'food_log_edit' && parsed.payload) {
      const { action, target_date, target_description, ...updates } = parsed.payload
      const result = await matchFoodEntry(userId, target_date, target_description)

      if (result.match === 'exact') {
        const entry = result.entries[0]
        if (action === 'delete') {
          await deleteFoodLog(entry.id, userId)
          if (target_date === todayStr()) {
            setFoodLog(prev => prev.filter(f => f.id !== entry.id))
          }
        } else {
          const dbUpdates: Record<string, unknown> = {}
          if (updates.updated_name !== undefined) dbUpdates.name = updates.updated_name
          if (updates.updated_calories !== undefined) dbUpdates.calories = updates.updated_calories
          if (updates.updated_protein !== undefined) dbUpdates.protein = updates.updated_protein
          if (updates.updated_carbs !== undefined) dbUpdates.carbs = updates.updated_carbs
          if (updates.updated_fat !== undefined) dbUpdates.fat = updates.updated_fat
          await updateFoodLog(entry.id, userId, dbUpdates)
          if (target_date === todayStr()) {
            setFoodLog(prev => prev.map(f =>
              f.id === entry.id
                ? { ...f,
                    name: updates.updated_name ?? f.name,
                    calories: updates.updated_calories ?? f.calories,
                    protein: updates.updated_protein ?? f.protein,
                    carbs: updates.updated_carbs ?? f.carbs,
                    fat: updates.updated_fat ?? f.fat,
                  }
                : f
            ))
            setEditedFoodIds(prev => new Set([...prev, entry.id]))
          }
        }
      }
    }

    if (parsed.type === 'activity_log_edit' && parsed.payload) {
      const { action, target_date, target_description, ...updates } = parsed.payload
      const result = await matchActivityEntry(userId, target_date, target_description)

      if (result.match === 'exact') {
        const entry = result.entries[0]
        if (action === 'delete') {
          await deleteActivityLog(entry.id, userId)
          if (target_date === todayStr()) {
            setActivityLog(prev => prev.filter(a => a.id !== entry.id))
            setCaloriesBurned(prev => prev - entry.calories_burned)
          }
        } else {
          const dbUpdates: Record<string, unknown> = {}
          if (updates.updated_label !== undefined) dbUpdates.label = updates.updated_label
          if (updates.updated_value !== undefined) dbUpdates.value = updates.updated_value
          if (updates.updated_calories_burned !== undefined) dbUpdates.calories_burned = updates.updated_calories_burned
          await updateActivityLog(entry.id, userId, dbUpdates)
          if (target_date === todayStr()) {
            setActivityLog(prev => prev.map(a =>
              a.id === entry.id
                ? { ...a,
                    label: updates.updated_label ?? a.label,
                    value: updates.updated_value ?? a.value,
                    calories_burned: updates.updated_calories_burned ?? a.calories_burned,
                  }
                : a
            ))
            if (updates.updated_calories_burned !== undefined) {
              setCaloriesBurned(prev => prev - entry.calories_burned + updates.updated_calories_burned!)
            }
            setEditedActivityIds(prev => new Set([...prev, entry.id]))
          }
        }
      }
    }

    if (parsed.type === 'food_log_backdate' && parsed.payload) {
      const { target_date, ...food } = parsed.payload
      const saved = await saveFoodLogForDate(userId, food, target_date)
      if (saved && target_date === todayStr()) {
        setFoodLog(prev => [...prev, saved])
      }
    }

    if (parsed.type === 'activity_log_backdate' && parsed.payload) {
      const { target_date, calories_burned, ...rest } = parsed.payload
      const saved = await saveActivityLogForDate(userId, { ...rest, calories_burned }, target_date)
      if (saved && target_date === todayStr()) {
        setActivityLog(prev => [...prev, saved])
        setCaloriesBurned(prev => prev + calories_burned)
      }
    }

    if (parsed.type === 'exception' && parsed.exception) {
      const ex = parsed.exception
      await saveException(userId, ex.note, ex.expires, ex.followUp)
    }

    if (parsed.type === 'daily_summary' && parsed.summary) {
      setDailySummary(parsed.summary)
      setDisplayMessages(prev => {
        const updated = [...prev]
        const last = updated[updated.length - 1]
        if (last?.role === 'coach') updated[updated.length - 1] = { ...last, summary: parsed.summary }
        return updated
      })
      await saveEpisode(userId, parsed.message, [
        `Calories: ${parsed.summary.totalCalories} eaten, ${parsed.summary.caloriesBurned} burned`,
        `Protein: ${parsed.summary.protein}g`,
        `Win: ${parsed.summary.highlight}`,
        `Improve: ${parsed.summary.improvement}`,
      ])
    }
  }

  async function handleDeleteFood(id: string) {
    await deleteFoodLog(id, userId)
    setFoodLog(prev => prev.filter(f => f.id !== id))
  }

  async function handleDeleteActivity(id: string) {
    const entry = activityLog.find(a => a.id === id)
    await deleteActivityLog(id, userId)
    setActivityLog(prev => prev.filter(a => a.id !== id))
    if (entry) setCaloriesBurned(prev => prev - entry.calories_burned)
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
            onDeleteActivity={handleDeleteActivity}
            coach={coach}
          />
        )}
        {activeTab === 'today' && (
          <TodayTab
            foodLog={foodLog}
            editedFoodIds={editedFoodIds}
            onDeleteFood={handleDeleteFood}
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
              const today = todayStr()
              setWeightHistory(prev => {
                const filtered = prev.filter(w => w.logged_date !== today)
                return [...filtered, { id: '', user_id: userId, logged_date: today, weight_lbs: lbs, created_at: new Date().toISOString() }]
                  .sort((a, b) => a.logged_date.localeCompare(b.logged_date))
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
