# Fitness Coach AI — Product Requirements Document

*Last updated: 2026-03-02*

---

## Overview

**Fitness Coach AI** is a mobile-first web app that gives users a personal AI fitness and nutrition coach in their pocket. Instead of calorie spreadsheets, meal plans, or rigid diet programs, the app works through natural conversation — users tell their coach what they ate, what they did, how they're feeling, and the coach responds with personalized guidance, accountability, and encouragement.

The core thesis: **most people don't fail at fitness because they lack information. They fail because they lack a consistent, judgment-free person to report to.** This app fills that role with AI.

---

## Who It's For

**Primary user:** Someone who wants to eat better and move more but doesn't want to become a nutrition nerd. They're not tracking macros in a spreadsheet. They're not meal prepping on Sundays. They want to make progress without it feeling like a second job.

**Psychographic:**
- Knows what they *should* do, struggles with consistency
- Wants to be held accountable but hates being lectured
- Busy — 10 minutes a day is realistic, not an hour
- Values personality and tone over clinical precision
- Mobile-first: logs meals from their phone at the table, not a desktop

**Anti-user:** Elite athletes, hardcore calorie counters, people who want barcode scanning or wearable sync. That's a different product.

---

## The Product

A progressive web app (mobile-optimized, max 430px wide) with three tabs:

### Coach Tab
The primary interface. A chat feed where users talk to their AI coach. The coach:
- Logs food when mentioned ("I just had a chicken sandwich")
- Logs activity ("just did 30 min run")
- Analyzes food photos for macros
- Gives real-time feedback ("you're 40g short on protein, here's a fix")
- Handles exceptions ("I'm at a wedding this weekend")
- Gives daily summaries on request
- Logs body weight when mentioned
- Remembers past sessions and references trends

### Today Tab
At-a-glance view of the current day:
- Weight card (log today's weight, update anytime)
- Weight history: 14-day sparkline + scrollable log with daily deltas
- Macro rings (protein / carbs / fat vs targets)
- Full food log for the day
- Dinner suggestion (coach-generated, based on remaining budget)
- Daily summary card (when requested)

### Activity Tab
Movement tracking:
- Log activities via dropdown (run, walk, cycle, swim, HIIT, weights, yoga, steps)
- Calories burned counter
- Activity history for the day

---

## The Coaches

Four distinct personalities — users pick one during onboarding and can switch later:

| Coach | Personality | Tone |
|-------|-------------|------|
| **Aria** 🌸 | Wellness Mentor | Warm, empowering, celebrates every win |
| **Coach Dre** 🔥 | The Roaster | One roast + one coaching point. Tough love. |
| **Dr. Chen** 🔬 | Sports Nutritionist | Evidence-based, precise, mechanistic |
| **Kai** ⚡ | Hype Coach | Unhinged Gen-Z enthusiasm, impossibly positive |

All coaches follow the same guardrails and response format — personality is the differentiator, not the underlying logic.

---

## Technical Architecture

### Stack
- **Frontend:** Next.js 15 App Router + TypeScript
- **Styling:** Tailwind CSS + shadcn/ui components
- **Auth + Database:** Supabase (email/password auth + Postgres with RLS)
- **AI:** Anthropic API (Claude Sonnet for coaching, Claude Haiku for topic classifier)
- **Deployment:** Vercel

### Database Schema
```
profiles          — user identity, goal, activity level, eating baseline, calorie target (derived), coach, streaks
episodes          — session summaries (max 7 per user, pruned automatically)
exceptions        — special occasions with expiry + follow-up flags
food_logs         — daily food entries with macros
activity_logs     — daily activity entries with calories burned
weight_logs       — one entry per day per user, upsert on conflict
```

All tables use Row Level Security — users can only access their own data.

### Memory Architecture (3 tiers)
1. **Working memory** — React state for the current session (resets on refresh)
2. **Episode memory** — Last 7 session summaries stored in Supabase, injected into every system prompt
3. **Semantic memory** — Profile fields (goal, streaks, coach notes, preferences) that persist indefinitely

### API Route (`POST /api/chat`)
- Auth-gated (Supabase JWT)
- Pre-flight topic classifier (Haiku) blocks off-topic requests
- Per-user rate limiting (in-memory, 30 req/min)
- Normalizes messages for vision support (photo uploads)
- Returns structured JSON that the client parses into actions (food_log, activity_log, weight_log, etc.)

### Coach Response Protocol
Every coach response is a JSON object with a `type` field:
```
food_log       — logs food, updates calorie/macro state
activity_log   — logs activity, updates burned calories
food_advice    — answers "should I eat X?" without logging
exception      — saves a special occasion with expiry date
daily_summary  — structured summary with highlight/improvement/tomorrow tip
weight_log     — saves body weight for the day
chat           — general response, no side effects
```

### Guardrails
- Topic classifier blocks non-wellness messages before they reach the main model
- System prompt includes hard rules: no medical diagnosis, no dangerous deficits, no jailbreaks
- Input validation: max 50 messages per context, 2000 chars per message
- Response length: 2 sentences maximum (enforced in system prompt + coach personalities)

---

## Onboarding Flow

5 steps, one question at a time, no numbers required:

1. **Name** — text input
2. **Main goal** — Lose weight / Build muscle / Eat better / More energy / All of the above
3. **Current eating** — Pretty good / Hit or miss / Mostly bad / No idea
4. **Activity level** — Sedentary / Light / Moderate / Very active
5. **Pick your coach** — card selection with taglines

Calorie target is derived silently from goal + activity level. Users never see or input a number unless they ask their coach directly.

---

## ✅ Shipped

| # | Feature | Notes |
|---|---------|-------|
| 1 | Mobile viewport stability | `100dvh` + `interactiveWidget: resizes-visual` — keyboard no longer reflows layout |
| 2 | Response length cap | 2-sentence hard cap in system prompt; Dre personality tightened separately |
| 3 | Returning user recognition | Trend-based greeting using last 3 episode summaries when `last_session` exists |
| 4 | Onboarding redesign | 5-step conversational flow, animated step dots, calorie target derived silently |
| 5 | Profile schema update | `goal`, `baseline`, `activity_level` on profiles; migration 002 |
| 6 | Weight logging | Today tab card + chat extraction + 14-day sparkline + history list |

---

## Roadmap

### P1 — Next Sprint

**7. Profile Edit Screen**
Users can't change coach or goal after setup. Churn risk.
- Settings screen accessible from dashboard
- Editable: coach, goal, activity level
- Calorie target recalculated on save

**8. Exception Follow-ups**
Infrastructure exists (`follow_up`, `follow_up_sent` on exceptions table). On login, check for expired exceptions with `follow_up = true` and inject into the greeting: "How was the wedding? Back on track today?"

**9. History Tab / Weekly View**
Biggest gap between "AI chatbot" and "actual fitness tracker." Users can only see today.
- Weekly grid: calories and protein per day for the last 7 days
- Color-coded: green = hit target, yellow = close, red = missed
- Tap a day to see its food log

### P2 — Quality of Life

**10. Streak Visualization**
Streaks are tracked in DB (`streaks.logging`, `streaks.protein`) but not shown.
- Fire badge in header when logging streak ≥ 3 days
- Protein streak badge when protein goal hit 3+ days running

**11. Weight Goal**
Let users set a target weight. Show progress in the weight card ("4.2 lbs to goal").

**12. Weekly Automated Summary**
Monday morning: avg daily calories, protein hit rate, workouts logged, weight trend for the week. Delivered as first coach message of the week.

**13. Coach Character Stress Testing**
Kai and Aria haven't been tested at scale. Each coach needs edge case review: slip days, no progress, injury, emotional check-ins.

---

## Out of Scope (For Now)
- Stripe / payments
- Social / sharing features
- Wearable integrations (Apple Watch, Fitbit, Garmin)
- Barcode / calorie scanning
- Push notifications (web push API)
- Native mobile app (PWA is sufficient for now)

---

## Open Questions
- Should the calorie pill in the header show "X left" or be hidden entirely until user asks?
- Should users be able to have multiple coaches active (e.g., switch day-to-day)?
- Long-term: does this become a subscription product or stay free during validation?
