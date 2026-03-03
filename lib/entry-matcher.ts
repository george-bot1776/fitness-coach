import { createClient } from '@/lib/supabase/client'
import type { FoodLog, ActivityLog } from '@/types'

export interface MatchResult<T> {
  match: 'exact' | 'ambiguous' | 'none'
  entries: T[]
}

// Score a food entry against a user description (higher = better match)
function scoreFoodEntry(entry: FoodLog, description: string): number {
  const desc = description.toLowerCase()
  const name = entry.name.toLowerCase()
  let score = 0

  // Exact name match
  if (name === desc) return 100

  // Name contains the description
  if (name.includes(desc)) score += 60

  // Description contains the name
  if (desc.includes(name)) score += 50

  // Word-level matches
  const descWords = desc.split(/\s+/)
  const nameWords = name.split(/\s+/)
  const matchedWords = descWords.filter(w => w.length > 2 && nameWords.some(n => n.includes(w) || w.includes(n)))
  score += matchedWords.length * 15

  // Meal context heuristics
  const hour = new Date(entry.created_at).getHours()
  if (desc.includes('breakfast') && hour >= 5 && hour < 11) score += 20
  if ((desc.includes('lunch') || desc.includes('midday')) && hour >= 11 && hour < 15) score += 20
  if (desc.includes('dinner') && hour >= 17 && hour < 23) score += 20
  if ((desc.includes('snack') || desc.includes('afternoon')) && ((hour >= 14 && hour < 17) || (hour >= 20 && hour < 23))) score += 15

  return score
}

function scoreActivityEntry(entry: ActivityLog, description: string): number {
  const desc = description.toLowerCase()
  const label = entry.label.toLowerCase()
  let score = 0

  if (label === desc) return 100
  if (label.includes(desc)) score += 60
  if (desc.includes(label)) score += 50

  const descWords = desc.split(/\s+/)
  const labelWords = label.split(/\s+/)
  const matchedWords = descWords.filter(w => w.length > 2 && labelWords.some(n => n.includes(w) || w.includes(n)))
  score += matchedWords.length * 15

  return score
}

export async function matchFoodEntry(
  userId: string,
  targetDate: string,
  description: string
): Promise<MatchResult<FoodLog>> {
  const supabase = createClient()
  const { data } = await supabase
    .from('food_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('session_date', targetDate)
    .order('created_at', { ascending: true })

  const entries: FoodLog[] = data ?? []
  if (entries.length === 0) return { match: 'none', entries: [] }

  const scored = entries
    .map(e => ({ entry: e, score: scoreFoodEntry(e, description) }))
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)

  if (scored.length === 0) return { match: 'none', entries: [] }

  const best = scored[0]
  const closeMatches = scored.filter(s => s.score >= best.score * 0.8)

  if (closeMatches.length === 1) {
    return { match: 'exact', entries: [best.entry] }
  }
  return { match: 'ambiguous', entries: closeMatches.map(s => s.entry) }
}

export async function matchActivityEntry(
  userId: string,
  targetDate: string,
  description: string
): Promise<MatchResult<ActivityLog>> {
  const supabase = createClient()
  const { data } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('session_date', targetDate)
    .order('created_at', { ascending: true })

  const entries: ActivityLog[] = data ?? []
  if (entries.length === 0) return { match: 'none', entries: [] }

  const scored = entries
    .map(e => ({ entry: e, score: scoreActivityEntry(e, description) }))
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)

  if (scored.length === 0) return { match: 'none', entries: [] }

  const best = scored[0]
  const closeMatches = scored.filter(s => s.score >= best.score * 0.8)

  if (closeMatches.length === 1) {
    return { match: 'exact', entries: [best.entry] }
  }
  return { match: 'ambiguous', entries: closeMatches.map(s => s.entry) }
}
