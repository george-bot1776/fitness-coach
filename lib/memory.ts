import { createClient } from '@/lib/supabase/client'
import type { Profile, Episode, AppException, FoodLog, ActivityLog, ChatMessage } from '@/types'

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

    // Update streak
    const supabase = createClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('streaks, last_session')
      .eq('id', userId)
      .single()

    if (profile) {
      const today = new Date().toDateString()
      const lastDay = profile.last_session ? new Date(profile.last_session).toDateString() : null
      const streaks = profile.streaks as { logging: number; protein: number }
      if (lastDay !== today) streaks.logging = (streaks.logging ?? 0) + 1

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
  const today = new Date().toISOString().split('T')[0]
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
}): Promise<void> {
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]
  await supabase.from('food_logs').insert({ user_id: userId, session_date: today, ...food })
}

export async function getTodayActivityLogs(userId: string): Promise<ActivityLog[]> {
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]
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
}): Promise<void> {
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]
  await supabase.from('activity_logs').insert({ user_id: userId, session_date: today, ...activity })
}
