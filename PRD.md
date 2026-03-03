# Fitness Coach AI — Product Roadmap

*Last updated: 2026-03-02*

---

## P0 — Critical Fixes (Ship This Week)

### 1. Viewport Instability
**Problem:** Page resizes inconsistently, especially on mobile when keyboard opens.
**Fix:** Lock viewport height, prevent layout reflow on keyboard show/hide.

### 2. Response Length
**Problem:** Coach messages are too long.
**Fix:** Hard cap at 2 sentences in the system prompt. Punchy, not wordy.

---

## P1 — Core Experience (Next Sprint)

### 3. Session Memory / Returning User Recognition
**Problem:** Coach says "let's get going!" every login as if it's day one.
**Wanted:** Coach acknowledges who Tim is, references last session, picks up the thread.
**Approach:**
- On login, fetch last episode summary from Supabase
- Inject into greeting: "Welcome back [name]. Last time: [summary]. What are we doing today?"
- No generic greetings if episode history exists

### 4. Onboarding Redesign — Remove Calorie Input
**Problem:** Asking for a calorie number assumes nutritional knowledge most users don't have.
**Wanted:** Conversational goal-setting that builds profile through questions.

**New onboarding flow (5 questions, one at a time):**
1. "What's your name?" → `name`
2. "What's your main goal right now?" → options: Lose weight / Build muscle / Eat better / More energy / All of the above → `goal`
3. "How would you describe your current eating?" → options: Pretty good / Hit or miss / Mostly bad / No idea → `baseline`
4. "How active are you week to week?" → options: Sedentary / Light / Moderate / Very active → `activity_level`
5. "Pick your coach" → coach selection card

**What we drop:** current weight, target lbs, calorie target fields.
**What we infer:** Claude calculates a sensible calorie target from goal + activity level + baseline. User never sees the number unless they ask.

---

## P2 — Quality of Life

### 5. Profile Schema Update
Add fields to `profiles` table:
- `goal` TEXT — 'lose_weight' | 'build_muscle' | 'eat_better' | 'more_energy' | 'all'
- `baseline` TEXT — 'good' | 'hit_or_miss' | 'mostly_bad' | 'no_idea'
- `activity_level` TEXT — 'sedentary' | 'light' | 'moderate' | 'very_active'

Calorie target becomes a **derived value** calculated by the system, stored internally, never shown in onboarding.

---

## Out of Scope (For Now)
- Stripe / payments
- Social features
- Wearable integrations
- Calorie scanning via barcode

---

## Open Questions
- Should returning users be able to edit their goal/coach after setup?
- Should the calorie pill in the header show "X left" or be hidden entirely until user asks?
