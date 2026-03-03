# Fitness Coach AI — Claude Code Context

## Stack
Next.js 15 App Router, TypeScript, Tailwind CSS, shadcn/ui, Supabase (Auth + Postgres), Vercel

## Key Conventions
- Server components by default; `'use client'` only when needed (interactivity, hooks, browser APIs)
- Supabase server client: `lib/supabase/server.ts` (use in server components, route handlers, middleware)
- Supabase browser client: `lib/supabase/client.ts` (use in client components)
- All forms in setup use shadcn `Form` + `react-hook-form`
- API routes live in `app/api/*/route.ts`
- Auth guard: `app/(app)/layout.tsx` — redirects to /login if no session

## Database Tables
- `profiles` (id=auth.uid, name, coach_id, goal, baseline, activity_level, calorie_target [derived], preferences[], coach_notes[], streaks, last_session, setup_complete)
- `episodes` (id, user_id, summary, key_facts[], created_at) — max 7 per user
- `exceptions` (id, user_id, note, expires, follow_up, follow_up_sent)
- `food_logs` (id, user_id, session_date, name, calories, protein, carbs, fat)
- `activity_logs` (id, user_id, session_date, label, value, unit, calories_burned)
- `weight_logs` (id, user_id, logged_date [UNIQUE per user/day], weight_lbs, created_at)

## Coach IDs
aria | dre | chen | kai — defined in lib/coaches.ts

## Response Types from /api/chat
food_log | activity_log | food_advice | exception | daily_summary | weight_log | chat | (blocked)

## Onboarding Flow (5 steps)
1. Name → 2. Goal (lose_weight/build_muscle/eat_better/more_energy/all) → 3. Baseline eating →
4. Activity level (sedentary/light/moderate/very_active) → 5. Pick coach
Calorie target is derived automatically, never shown during onboarding.

## Environment Variables
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, ANTHROPIC_API_KEY

## Models Used
- Main chat: claude-sonnet-4-20250514
- Topic classifier: claude-haiku-4-5-20251001
