export interface Profile {
  id: string
  name: string | null
  coach_id: string
  current_weight: number | null
  target_lbs: number | null
  calorie_target: number
  goal: 'lose_weight' | 'build_muscle' | 'eat_better' | 'more_energy' | 'all' | null
  baseline: 'good' | 'hit_or_miss' | 'mostly_bad' | 'no_idea' | null
  activity_level: 'sedentary' | 'light' | 'moderate' | 'very_active' | null
  preferences: string[]
  coach_notes: string[]
  streaks: { logging: number; protein: number }
  last_session: string | null
  setup_complete: boolean
  created_at: string
  updated_at: string
}

export interface WeightLog {
  id: string
  user_id: string
  logged_date: string
  weight_lbs: number
  created_at: string
}

export interface Episode {
  id: string
  user_id: string
  summary: string
  key_facts: string[]
  created_at: string
}

export interface AppException {
  id: string
  user_id: string
  note: string
  expires: string
  follow_up: boolean
  follow_up_sent: boolean
  created_at: string
}

export interface FoodLog {
  id: string
  user_id: string
  session_date: string
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  created_at: string
}

export interface ActivityLog {
  id: string
  user_id: string
  session_date: string
  label: string
  value: number
  unit: string
  calories_burned: number
  created_at: string
}

export interface Coach {
  id: string
  name: string
  title: string
  emoji: string
  color: string        // primary accent (used throughout)
  accentGlow: string  // accent at 15% opacity for glows
  gradient: string    // 135deg two-stop gradient string
  headerGradient: string // subtle header background gradient
  ringTrack: string   // macro ring track color (accent at 12%)
  tagline: string
  modeLabel: string
  personality: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string | ContentBlock[]
}

export interface ContentBlock {
  type: 'text' | 'image'
  text?: string
  source?: {
    type: 'base64'
    media_type: string
    data: string
  }
}

export interface FoodItem {
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
}

export interface ActivityItem {
  label: string
  value: number
  unit: string
  caloriesBurned: number
}

export interface DailySummary {
  totalCalories: number
  caloriesBurned: number
  netCalories: number
  protein: number
  highlight: string
  improvement: string
  tomorrowTip: string
}

export type CoachResponseType =
  | { type: 'food_log'; message: string; food: FoodItem; dinnerSuggestion?: string }
  | { type: 'activity_log'; message: string; activity: ActivityItem }
  | { type: 'food_advice'; message: string }
  | { type: 'exception'; message: string; exception: { note: string; expires: string; followUp: boolean } }
  | { type: 'daily_summary'; message: string; summary: DailySummary }
  | { type: 'weight_log'; message: string; weight: { lbs: number } }
  | { type: 'chat'; message: string }
  | { blocked: true; message: string }

export interface SessionState {
  messages: ChatMessage[]
  foodLog: FoodItem[]
  activityLog: ActivityItem[]
  caloriesBurned: number
  dinnerSuggestion: string | null
  dailySummary: DailySummary | null
}
