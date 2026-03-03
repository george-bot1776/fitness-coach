import { createClient } from '@/lib/supabase/client'
import type { Profile, Episode, AppException, FoodLog, ActivityLog, ChatMessage, WeightLog } from '@/types'

// Always use the browser's local date (not UTC) so a meal logged at 11 PM
// stays on that day's log, not the next UTC day.
function localDate(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ---- Profile (Tier 3) ----------------------------------------

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return data
}

export async function saveProfile(userId: string, updates: Partial<Profile>): Promise<void> {
  const supabase = createClient()
  await supabase
    .from('profiles')
    .upsert({ id: userId, ...updates, updated_at: new Date().toISOString() })
}

// ---- Episodes (Tier 2) ---------------------------------------

const MAX_EPISODES = 7

export async function getEpisodes(userId: string): Promise<Episode[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('episodes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(MAX_EPISODES)
  return data ?? []
}

export async function saveEpisode(
  userId: string,
  summary: string,
  keyFacts: string[]
): Promise<void> {
  const supabase = createClient()

  await supabase.from('episodes').insert({
    user_id: userId,
    summary,
    key_facts: keyFacts,
  })

  // Prune: keep only last MAX_EPISODES
  const { data: all } = await supabase
    .from('episodes')
    .select('id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (all && all.length > MAX_EPISODES) {
    const toDelete = all.slice(MAX_EPISODES).map((e) => e.id)
    await supabase.from('episodes').delete().in('id', toDelete)
  }
}

// ---- Exceptions ---------------------------------------------

export async function checkExceptions(userId: string): Promise<AppException[]> {
  const supabase = createClient()
  const now = new Date().toISOString()

  const { data: triggered } = await supabase
    .from('exceptions')
    .select('*')
    .eq('user_id', userId)
    .eq('follow_up', true)
    .eq('follow_up_sent', false)
    .lte('expires', now)

  if (triggered?.length) {
    const ids = triggered.map((e) => e.id)
    await supabase.from('exceptions').update({ follow_up_sent: true }).in('id', ids)
  }

  return triggered ?? []
}

export async function saveException(
  userId: string,
  note: string,
  expires: string,
  followUp = true
): Promise<void> {
  const supabase = createClient()
  await supabase.from('exceptions').insert({
    user_id: userId,
    note,
    expires,
    follow_up: followUp,
    follow_up_sent: false,
  })
}

// ---- Context Builder ----------------------------------------

export async function buildContextString(userId: string): Promise<string> {
  const supabase = createClient()
  const lines: string[] = []

  // Today's and yesterday's logs (so coach can reference them for edits/corrections)
  const today = localDate()
  const yesterdayDate = new Date()
  yesterdayDate.setDate(yesterdayDate.getDate() - 1)
  const yesterday = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, '0')}-${String(yesterdayDate.getDate()).padStart(2, '0')}`

  const [todayFoods, yesterdayFoods, todayActivities, yesterdayActivities] = await Promise.all([
    supabase.from('food_logs').select('name,calories,protein,carbs,fat').eq('user_id', userId).eq('session_date', today).order('created_at', { ascending: true }),
    supabase.from('food_logs').select('name,calories,protein,carbs,fat').eq('user_id', userId).eq('session_date', yesterday).order('created_at', { ascending: true }),
    supabase.from('activity_logs').select('label,value,unit,calories_burned').eq('user_id', userId).eq('session_date', today),
    supabase.from('activity_logs').select('label,value,unit,calories_burned').eq('user_id', userId).eq('session_date', yesterday),
  ])

  if (todayFoods.data?.length) {
    const totalCal = todayFoods.data.reduce((s, f) => s + f.calories, 0)
    const totalPro = todayFoods.data.reduce((s, f) => s + f.protein, 0)
    lines.push(`TODAY'S FOOD LOG (${today}):`)
    todayFoods.data.forEach(f => lines.push(`  - ${f.name}: ${f.calories} kcal, ${f.protein}p/${f.carbs}c/${f.fat}f`))
    lines.push(`  Total: ${totalCal} kcal, ${totalPro}g protein`)
  }

  if (todayActivities.data?.length) {
    lines.push(`TODAY'S ACTIVITIES:`)
    todayActivities.data.forEach(a => lines.push(`  - ${a.label}: ${a.value} ${a.unit}, ${a.calories_burned} kcal burned`))
  }

  if (yesterdayFoods.data?.length) {
    const totalCal = yesterdayFoods.data.reduce((s, f) => s + f.calories, 0)
    const totalPro = yesterdayFoods.data.reduce((s, f) => s + f.protein, 0)
    lines.push(`YESTERDAY'S FOOD LOG (${yesterday}):`)
    yesterdayFoods.data.forEach(f => lines.push(`  - ${f.name}: ${f.calories} kcal, ${f.protein}p/${f.carbs}c/${f.fat}f`))
    lines.push(`  Total: ${totalCal} kcal, ${totalPro}g protein`)
  }

  if (yesterdayActivities.data?.length) {
    lines.push(`YESTERDAY'S ACTIVITIES:`)
    yesterdayActivities.data.forEach(a => lines.push(`  - ${a.label}: ${a.value} ${a.unit}, ${a.calories_burned} kcal burned`))
  }

  // Active exceptions
  const now = new Date().toISOString()
  const { data: active } = await supabase
    .from('exceptions')
    .select('note, expires')
    .eq('user_id', userId)
    .gt('expires', now)

  if (active?.length) {
    lines.push('ACTIVE EXCEPTIONS:')
    active.forEach((ex) => {
      const until = new Date(ex.expires).toLocaleDateString()
      lines.push(`  - ${ex.note} (until ${until})`)
    })
  }

  // Profile (for streaks + notes)
  const { data: profile } = await supabase
    .from('profiles')
    .select('streaks, coach_notes')
    .eq('id', userId)
    .single()

  if (profile?.coach_notes?.length) {
    lines.push('COACH NOTES:')
    profile.coach_notes.slice(-3).forEach((n: string) => lines.push(`  - ${n}`))
  }

  if (profile?.streaks) {
    const { logging, protein } = profile.streaks as { logging: number; protein: number }
    if (logging > 1) lines.push(`STREAK: ${logging} days logging in a row`)
    if (protein > 1) lines.push(`STREAK: ${protein} days hitting protein goal`)
  }

  // Episodes
  const { data: episodes } = await supabase
    .from('episodes')
    .select('summary, key_facts, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(3)

  if (episodes?.length) {
    lines.push(`RECENT SESSION HISTORY (last ${episodes.length} sessions):`)
    episodes.forEach((ep) => {
      const d = new Date(ep.created_at).toLocaleDateString()
      lines.push(`  [${d}] ${ep.summary}`)
      if (ep.key_facts?.length) {
        ep.key_facts.forEach((f: string) => lines.push(`    • ${f}`))
      }
    })
  }

  return lines.join('\n')
}

// ---- Session Summarizer -------------------------------------

export async function summarizeSession(
  userId: string,
  messages: ChatMessage[],
  accessToken: string
): Promise<void> {
  if (messages.length < 2) return

  const transcript = messages
    .map((m) => {
      const role = m.role === 'user' ? 'User' : 'Coach'
      const text =
        typeof m.content === 'string'
          ? m.content
          : m.content
              .filter((b) => b.type === 'text')
              .map((b) => b.text)
              .join(' ')
      return `${role}: ${text}`
    })
    .join('\n')
    .slice(0, 3000)

  if (!transcript.trim()) return

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        isSummary: true,
        messages: [
          {
            role: 'user',
            content: `Summarize this fitness coaching session in 1-2 sentences, then list 3-5 key facts as JSON.
Return ONLY valid JSON: {"summary":"...","keyFacts":["...","...","..."]}

SESSION TRANSCRIPT:
${transcript}`,
          },
        ],
        system: 'You are a concise session summarizer. Return only valid JSON, no markdown.',
      }),
    })

    if (!res.ok) return
    const data = await res.json()
    const raw = data.content?.[0]?.text?.trim()
    if (!raw) return
    const clean = raw.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim()
    const parsed = JSON.parse(clean)
    await saveEpisode(userId, parsed.summary, parsed.keyFacts ?? [])

    // Update streaks
    const supabase = createClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('streaks, last_session, calorie_target')
      .eq('id', userId)
      .single()

    if (profile) {
      const today = localDate()
      const yd = new Date(); yd.setDate(yd.getDate() - 1)
      const yesterday = `${yd.getFullYear()}-${String(yd.getMonth()+1).padStart(2,'0')}-${String(yd.getDate()).padStart(2,'0')}`

      // Convert last_session ISO timestamp → local date string
      const lastDay = profile.last_session
        ? (() => { const d = new Date(profile.last_session); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` })()
        : null

      type Streaks = { logging: number; protein: number; longestLogging?: number; longestProtein?: number }
      const streaks: Streaks = { logging: 0, protein: 0, ...(profile.streaks ?? {}) }

      // --- Logging streak ---
      // Reset to 1 on first session OR after any gap, increment on consecutive day,
      // leave unchanged if re-logging the same day
      if (lastDay === null || lastDay < yesterday) {
        streaks.logging = 1
      } else if (lastDay === yesterday) {
        streaks.logging = (streaks.logging ?? 0) + 1
      }
      // lastDay === today → multiple sessions today → no change

      // --- Protein streak ---
      // Query today's protein total and compare to goal
      const { data: foodToday } = await supabase
        .from('food_logs')
        .select('protein')
        .eq('user_id', userId)
        .eq('session_date', today)

      const totalProtein = foodToday?.reduce((s: number, f: { protein: number }) => s + f.protein, 0) ?? 0
      const proteinTarget = Math.round(((profile.calorie_target ?? 2000) * 0.30) / 4)
      const hitProtein = totalProtein >= proteinTarget

      if (lastDay === null || lastDay < yesterday) {
        // First session or missed days
        streaks.protein = hitProtein ? 1 : 0
      } else if (lastDay === yesterday) {
        // Consecutive day
        streaks.protein = hitProtein ? (streaks.protein ?? 0) + 1 : 0
      } else if (lastDay === today) {
        // Multiple sessions same day: only upgrade if now hitting protein and streak is 0
        // (don't penalize if they haven't finished eating for the day)
        if (hitProtein && (streaks.protein ?? 0) === 0) streaks.protein = 1
      }

      // --- Longest streaks ---
      streaks.longestLogging = Math.max(streaks.longestLogging ?? 0, streaks.logging)
      streaks.longestProtein = Math.max(streaks.longestProtein ?? 0, streaks.protein)

      await supabase.from('profiles').update({
        streaks,
        last_session: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', userId)
    }
  } catch {
    // Best-effort — never block the user
  }
}

// ---- Today's Logs -------------------------------------------

export async function getTodayFoodLogs(userId: string): Promise<FoodLog[]> {
  const supabase = createClient()
  const today = localDate()
  const { data } = await supabase
    .from('food_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('session_date', today)
    .order('created_at', { ascending: true })
  return data ?? []
}

export async function saveFoodLog(userId: string, food: {
  name: string; calories: number; protein: number; carbs: number; fat: number
}): Promise<FoodLog | null> {
  const supabase = createClient()
  const today = localDate()
  const { data } = await supabase
    .from('food_logs')
    .insert({ user_id: userId, session_date: today, ...food })
    .select()
    .single()
  return data ?? null
}

export async function getFoodLogsByDate(userId: string, date: string): Promise<FoodLog[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('food_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('session_date', date)
    .order('created_at', { ascending: true })
  return data ?? []
}

export async function saveFoodLogForDate(userId: string, food: {
  name: string; calories: number; protein: number; carbs: number; fat: number
}, date: string): Promise<FoodLog | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from('food_logs')
    .insert({ user_id: userId, session_date: date, ...food })
    .select()
    .single()
  return data ?? null
}

export async function updateFoodLog(id: string, userId: string, updates: {
  name?: string; calories?: number; protein?: number; carbs?: number; fat?: number
}): Promise<void> {
  const supabase = createClient()
  await supabase.from('food_logs').update(updates).eq('id', id).eq('user_id', userId)
}

export async function deleteFoodLog(id: string, userId: string): Promise<void> {
  const supabase = createClient()
  await supabase.from('food_logs').delete().eq('id', id).eq('user_id', userId)
}

export async function getTodayActivityLogs(userId: string): Promise<ActivityLog[]> {
  const supabase = createClient()
  const today = localDate()
  const { data } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('session_date', today)
    .order('created_at', { ascending: true })
  return data ?? []
}

export async function saveActivityLog(userId: string, activity: {
  label: string; value: number; unit: string; calories_burned: number
}): Promise<ActivityLog | null> {
  const supabase = createClient()
  const today = localDate()
  const { data } = await supabase
    .from('activity_logs')
    .insert({ user_id: userId, session_date: today, ...activity })
    .select()
    .single()
  return data ?? null
}

export async function getActivityLogsByDate(userId: string, date: string): Promise<ActivityLog[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('session_date', date)
    .order('created_at', { ascending: true })
  return data ?? []
}

export async function saveActivityLogForDate(userId: string, activity: {
  label: string; value: number; unit: string; calories_burned: number
}, date: string): Promise<ActivityLog | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from('activity_logs')
    .insert({ user_id: userId, session_date: date, ...activity })
    .select()
    .single()
  return data ?? null
}

export async function updateActivityLog(id: string, userId: string, updates: {
  label?: string; value?: number; unit?: string; calories_burned?: number
}): Promise<void> {
  const supabase = createClient()
  await supabase.from('activity_logs').update(updates).eq('id', id).eq('user_id', userId)
}

export async function deleteActivityLog(id: string, userId: string): Promise<void> {
  const supabase = createClient()
  await supabase.from('activity_logs').delete().eq('id', id).eq('user_id', userId)
}

// ---- Weight Logs --------------------------------------------

export async function getTodayWeightLog(userId: string): Promise<WeightLog | null> {
  const supabase = createClient()
  const today = localDate()
  const { data } = await supabase
    .from('weight_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('logged_date', today)
    .single()
  return data ?? null
}

export async function getWeightHistory(userId: string, days = 30): Promise<WeightLog[]> {
  const supabase = createClient()
  const since = new Date()
  since.setDate(since.getDate() - days)
  const sinceStr = `${since.getFullYear()}-${String(since.getMonth() + 1).padStart(2, '0')}-${String(since.getDate()).padStart(2, '0')}`
  const { data } = await supabase
    .from('weight_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('logged_date', sinceStr)
    .order('logged_date', { ascending: true })
  return data ?? []
}

export async function saveWeightLog(userId: string, weightLbs: number, date?: string): Promise<void> {
  const supabase = createClient()
  await supabase.from('weight_logs').upsert({
    user_id: userId,
    logged_date: date ?? localDate(),
    weight_lbs: weightLbs,
  }, { onConflict: 'user_id,logged_date' })
}
