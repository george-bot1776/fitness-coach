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
- `profiles` (id=auth.uid, name, coach_id, current_weight, target_lbs, calorie_target, preferences[], coach_notes[], streaks, last_session, setup_complete)
- `episodes` (id, user_id, summary, key_facts[], created_at) — max 7 per user
- `exceptions` (id, user_id, note, expires, follow_up, follow_up_sent)
- `food_logs` (id, user_id, session_date, name, calories, protein, carbs, fat)
- `activity_logs` (id, user_id, session_date, label, value, unit, calories_burned)

## Coach IDs
aria | dre | chen | kai — defined in lib/coaches.ts

## Response Types from /api/chat
food_log | activity_log | food_advice | exception | daily_summary | chat | (blocked)

## Environment Variables
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, ANTHROPIC_API_KEY

## Models Used
- Main chat: claude-sonnet-4-20250514
- Topic classifier: claude-haiku-4-5-20251001
