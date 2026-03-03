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

## Build Status (as of 2026-03-03)

### Phase 1: Retention Foundation — COMPLETE ✅
All 5 tasks shipped. Next session starts Phase 2.

**Shipped features:**
- Profile Edit screen at `/settings` — gear icon in dashboard header. Editable: name, coach, goal, activity level. Recalculates calorie target on save. Coach accent updates immediately.
- History Tab — 4th tab (Coach/Activity/Today/History). Weekly grid with color-coded calorie/protein rows. Expandable days showing full food log. Week navigation. Weekly averages card. Fetches last 28 days, filters client-side.
- Exception Follow-ups — On app load, `checkExceptions(userId)` is called in `initGreeting()` in DashboardShell. Expired follow-ups injected into coach greeting prompt. Already marks `follow_up_sent=true`.
- Streak Visualization — 🔥N / 💪N badges in header (pulse animation) when streaks >= 3. Streaks card in TodayTab. Milestone acknowledgment in greeting (3/7/14/30/60/100 days).
- Daily Summary — "Daily summary" chip now renders `SummaryCard` inline in chat feed (not just Today tab). Saved to episodes table on generation.

### Key component locations
- `components/dashboard/DashboardShell.tsx` — main app shell, all state, greeting init
- `components/dashboard/Header.tsx` — header with tabs, streak badges, gear icon → /settings
- `components/dashboard/HistoryTab.tsx` — new: weekly history view
- `components/dashboard/CoachTab.tsx` — chat feed, now renders SummaryCard inline
- `components/settings/ProfileEditForm.tsx` — new: profile/coach edit form
- `app/(app)/settings/page.tsx` — new: settings page (server component)
- `lib/memory.ts` — checkExceptions, saveEpisode, saveProfile etc.
- `lib/coaches.ts` — COACHES record with all 4 coach definitions
- `lib/prompts.ts` — buildSystemPrompt

### Phase 2: Coach as Data Agent — COMPLETE ✅ (2026-03-03)

**Shipped:**
- Coach handles retroactive data: edits, deletes, backdates for food, activity, and weight
- 4 new response types: `food_log_edit`, `activity_log_edit`, `food_log_backdate`, `activity_log_backdate`
- `lib/entry-matcher.ts` — fuzzy matches entries by date + description (name similarity + meal context heuristics)
- `buildContextString` now injects today's + yesterday's food/activity logs so coach knows what's logged
- System prompt updated with full data agent instructions (detect intent, date resolution, confirmation pattern)
- Today's in-memory state (foodLog, activityLog) updated on edit/delete/backdate for current day

**Key files:**
- `lib/entry-matcher.ts` — new: fuzzy entry matching
- `lib/memory.ts` — new: getFoodLogsByDate, getActivityLogsByDate, saveFoodLogForDate, saveActivityLogForDate, updateFoodLog, deleteFoodLog, updateActivityLog, deleteActivityLog
- `lib/prompts.ts` — data agent instructions + 4 new response type formats
- `types/index.ts` — FoodLogEdit, ActivityLogEdit, FoodLogBackdate, ActivityLogBackdate interfaces + CoachResponseType variants
- `components/dashboard/DashboardShell.tsx` — handleCoachResponse extended for all 4 new types

**Deferred:** UI swipe-to-edit/delete on food log cards (chat-based agent covers all same actions)

### Phase 3 Next Tasks (pick up here)
3.1 Macro Accuracy Validation Pipeline — `lib/macro-validation.ts` + food log edit UI (swipe-to-edit fallback)
3.2 Weight Goal + Progress — target weight in settings, progress bar, projections
3.3 Weekly Automated Summary — Monday morning coach summary
3.4 Deep Onboarding V2 — 9 questions, dietary restrictions, challenges, checkin prefs
3.5 Coach Stress Testing — `scripts/coach-stress-test.ts`
3.6 Web Push Notifications — service worker, VAPID, Vercel cron
