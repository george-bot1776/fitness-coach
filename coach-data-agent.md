# Retroactive Data Management — Coach as Data Agent

> **Usage:** Paste this into Claude Code from your project root:
> ```
> Read @coach-data-agent.md and implement the system described.
> ```

---

## Problem

Users can only log data for *right now*. But real life doesn't work that way:

- "My weight yesterday was 204, not 202"
- "Actually that lunch was a burrito, not a chicken sandwich"
- "I forgot to log dinner last night — I had grilled salmon and rice"
- "Delete that snack I logged, I didn't actually eat it"
- "I did a 45-min run on Tuesday, forgot to log it"
- "Change my protein for breakfast to 40g, the AI got it wrong"

The coach needs to function as a **data agent** — understanding user intent around corrections, backdated entries, deletions, and edits, then executing the right database operation.

---

## Architecture: New Response Types

Extend the existing coach response protocol with new `type` values. Currently the coach returns JSON with types like `food_log`, `activity_log`, `weight_log`, `chat`, etc. Add these:

### New response types

```typescript
// Edit an existing food log entry
type: "food_log_edit"
payload: {
  action: "update" | "delete",
  // Identification — how to find the entry to edit:
  target_date: string,         // ISO date, e.g. "2026-03-02"
  target_description: string,  // fuzzy match, e.g. "chicken sandwich" or "lunch"
  // Updated values (only for "update" action):
  updated_name?: string,
  updated_calories?: number,
  updated_protein?: number,
  updated_carbs?: number,
  updated_fat?: number,
}

// Edit an existing activity log entry
type: "activity_log_edit"
payload: {
  action: "update" | "delete",
  target_date: string,
  target_description: string,  // e.g. "run" or "HIIT" or "morning walk"
  updated_type?: string,
  updated_duration?: number,
  updated_calories?: number,
}

// Edit a weight log entry (including backdated)
type: "weight_log_edit"
payload: {
  action: "update",
  target_date: string,         // the date to correct
  updated_weight: number,
}

// Backdate a food log (log something for a past day)
type: "food_log_backdate"
payload: {
  target_date: string,
  name: string,
  calories: number,
  protein: number,
  carbs: number,
  fat: number,
  meal_context?: string,       // "dinner", "lunch", "snack", etc.
}

// Backdate an activity log
type: "activity_log_backdate"
payload: {
  target_date: string,
  type: string,
  duration_minutes: number,
  calories_burned: number,
}

// Backdate a weight log (log weight for a past day)
type: "weight_log_backdate"
payload: {
  target_date: string,
  weight: number,
}
```

---

## System Prompt Updates

Add this section to the coach system prompt (the part that instructs Claude on how to respond). Insert it alongside the existing instructions for `food_log`, `activity_log`, etc.:

```
## Data Corrections & Retroactive Logging

You are the user's data agent. When they ask you to correct, update, delete,
or backdate any logged data, you MUST handle it — never tell them to "go to
settings" or "edit it manually."

### How to interpret correction requests:

PATTERN: "Actually [X] was [Y]" or "[X] was wrong" or "Change [X] to [Y]"
→ This is an EDIT. Find the matching entry and update it.

PATTERN: "Delete [X]" or "Remove [X]" or "I didn't actually [X]"
→ This is a DELETE. Find the matching entry and remove it.

PATTERN: "Yesterday I had [X]" or "I forgot to log [X] on Tuesday"
→ This is a BACKDATE. Create a new entry for the specified past date.

PATTERN: "My weight yesterday was [X]" or "I was [X] lbs on Monday"
→ This is a WEIGHT CORRECTION or BACKDATE. Update or create the weight
  entry for that date.

### Date interpretation:
- "yesterday" = one day before today
- "Tuesday" or "last Tuesday" = most recent past Tuesday
- "this morning" = today
- "2 days ago" = two days before today
- If ambiguous, ASK which day they mean before making changes.

### Matching entries:
When the user says "change my lunch" or "that chicken sandwich," you need to
match against existing entries. Use fuzzy matching:
- "lunch" → match by meal_context or time of day (11am-2pm entries)
- "chicken sandwich" → match by food name similarity
- "that snack" → match the most recent snack-like entry
- If multiple matches are possible, ASK the user to clarify:
  "I see two entries around lunchtime — the chicken wrap (650 kcal) and the
  Greek yogurt (150 kcal). Which one are you correcting?"

### Confirmation:
For EDITS and DELETES, always confirm what you're changing:
- "Got it — I updated yesterday's dinner from 'pizza (800 kcal)' to
  'grilled chicken salad (450 kcal)'. Your totals for yesterday are now 1,820 kcal."
- "Removed that 3pm snack (chips, 320 kcal). Today's total is now 1,450 kcal."

For BACKDATES, confirm the entry and date:
- "Logged your Tuesday dinner: grilled salmon with rice (580 kcal, 42g protein).
  That brings Tuesday's total to 2,100 kcal."

### Guardrails:
- Never edit data older than 7 days without confirming: "That's from over a
  week ago — are you sure you want to update it?"
- Never delete all entries for a day without double-checking: "That would
  clear your entire log for yesterday. Want me to go ahead?"
- After any edit, recalculate and state the updated daily totals so the user
  sees the impact.
```

---

## Backend Implementation

### 1. Entry Matching Function

Create `lib/entry-matcher.ts`:

```typescript
// This function finds the most likely matching entry when the user says
// "change my lunch" or "that chicken sandwich yesterday"
//
// Inputs:
//   - table: 'food_logs' | 'activity_logs' | 'weight_logs'
//   - userId: string
//   - targetDate: string (ISO date)
//   - description: string (fuzzy search term from the user)
//
// Logic:
//   1. Query all entries for that user on that date
//   2. Score each entry against the description using:
//      a. Name similarity (case-insensitive substring match)
//      b. Meal context matching ("lunch" matches entries from 11am-2pm)
//      c. Recency (if multiple matches, prefer most recent)
//   3. If exactly 1 match with high confidence → return it
//   4. If multiple matches → return all candidates (coach will ask user)
//   5. If no match → return null (coach will say "I can't find that entry")
//
// Return type:
//   { match: 'exact' | 'ambiguous' | 'none', entries: LogEntry[] }
```

### 2. API Route Updates

Update `POST /api/chat` (or the response handler) to process the new types:

```typescript
// After receiving the coach's structured JSON response, handle new types:

switch (response.type) {
  case 'food_log_edit': {
    if (response.payload.action === 'update') {
      // 1. Find the matching entry using entry-matcher
      // 2. Update the row in food_logs
      // 3. Return updated daily totals in the response
    }
    if (response.payload.action === 'delete') {
      // 1. Find the matching entry
      // 2. Delete the row from food_logs
      // 3. Return updated daily totals
    }
    break;
  }

  case 'food_log_backdate': {
    // 1. Insert into food_logs with created_at set to target_date
    // 2. Return the new entry + that day's updated totals
    break;
  }

  case 'weight_log_edit': {
    // 1. Find weight_log for target_date
    // 2. Update the weight value
    // 3. Return updated weight + trend data
    break;
  }

  case 'weight_log_backdate': {
    // 1. Upsert into weight_logs for target_date
    //    (use ON CONFLICT since weight_logs is one-per-day)
    // 2. Return updated weight history
    break;
  }

  case 'activity_log_edit': {
    // Same pattern as food_log_edit
    break;
  }

  case 'activity_log_backdate': {
    // Same pattern as food_log_backdate
    break;
  }
}
```

### 3. Database Considerations

```sql
-- food_logs and activity_logs likely use created_at for the date.
-- For backdated entries, we need to SET created_at to the target date,
-- not let it default to now().
--
-- Ensure the insert logic allows overriding created_at:
INSERT INTO food_logs (user_id, name, calories, protein, carbs, fat, created_at)
VALUES ($1, $2, $3, $4, $5, $6, $7::timestamptz);
--                                    ^ target_date passed explicitly

-- For weight_logs (already has upsert logic):
INSERT INTO weight_logs (user_id, weight, logged_date)
VALUES ($1, $2, $3::date)
ON CONFLICT (user_id, logged_date)
DO UPDATE SET weight = EXCLUDED.weight, updated_at = now();

-- Consider adding an `edited` boolean or `edit_history` JSONB column
-- to food_logs so the UI can show "edited" badge on corrected entries:
ALTER TABLE food_logs ADD COLUMN edited boolean DEFAULT false;
ALTER TABLE food_logs ADD COLUMN original_values jsonb;
```

### 4. Context Injection

The coach needs to know what's already logged to make corrections. Update the system prompt context to include today's (and optionally yesterday's) logged entries:

```typescript
// When building the system prompt for /api/chat, include:
const todayLogs = await getFoodLogs(userId, today);
const yesterdayLogs = await getFoodLogs(userId, yesterday);
const todayWeight = await getWeightLog(userId, today);
const yesterdayWeight = await getWeightLog(userId, yesterday);
const todayActivities = await getActivityLogs(userId, today);

const contextBlock = `
## Current Data (for reference when user requests edits)

TODAY (${today}):
${todayLogs.map(f => `- ${f.name}: ${f.calories} kcal, ${f.protein}p/${f.carbs}c/${f.fat}f (logged ${f.created_at})`).join('\n')}
Total: ${sum(todayLogs, 'calories')} kcal, ${sum(todayLogs, 'protein')}g protein
Weight: ${todayWeight?.weight || 'not logged'} lbs
Activities: ${todayActivities.map(a => `${a.type} ${a.duration}min ${a.calories}kcal`).join(', ') || 'none'}

YESTERDAY (${yesterday}):
${yesterdayLogs.map(f => `- ${f.name}: ${f.calories} kcal, ${f.protein}p/${f.carbs}c/${f.fat}f`).join('\n')}
Total: ${sum(yesterdayLogs, 'calories')} kcal
Weight: ${yesterdayWeight?.weight || 'not logged'} lbs
`;
```

This is critical — without this context, the coach can't know what "that chicken sandwich" refers to. Inject this into every system prompt.

---

## UI Updates

### Food Log Entry — Edit/Delete Actions

On the Today tab (and History tab), each food log card should support:
- **Swipe left** (or long-press on mobile) → reveal Edit and Delete buttons
- **Edit** opens a modal pre-filled with current values (name, calories, protein, carbs, fat). User can modify and save.
- **Delete** shows confirmation, then removes the entry.
- These direct-edit actions are a fallback for users who prefer tapping over chatting.

### Edited Entry Badge

Entries that have been corrected should show a subtle "edited" indicator (small pencil icon or italic text) so users know which entries were modified.

### Backdated Entry Indicator

Entries added retroactively should show the original date, not today's date. In the chat, the coach should say "Logged for Tuesday" not just "Logged."

---

## Test Cases

After implementing, verify these conversations work end-to-end:

1. **Simple correction:**
   User: "My weight yesterday was 204, not 202"
   → weight_log_edit for yesterday, update to 204

2. **Food swap:**
   User: "Yesterday my dinner was salmon, not pizza"
   → food_log_edit, match "pizza" on yesterday, replace with salmon + new macros

3. **Forgotten entry:**
   User: "I forgot to log my morning coffee with cream yesterday"
   → food_log_backdate for yesterday

4. **Deletion:**
   User: "Delete that yogurt I logged, I didn't eat it"
   → food_log_edit with action: delete, match "yogurt" on today

5. **Activity correction:**
   User: "That walk was 45 minutes, not 30"
   → activity_log_edit, match "walk" on today, update duration + recalc calories

6. **Ambiguous match:**
   User: "Change my lunch calories"
   → If multiple entries around lunchtime, coach asks which one

7. **Old entry guard:**
   User: "Update my weight from 2 weeks ago"
   → Coach confirms: "That's from over a week ago — sure you want to change it?"

8. **Bulk backdate:**
   User: "I didn't log anything yesterday. I had eggs for breakfast, a sandwich for lunch, and pasta for dinner"
   → Three food_log_backdate entries for yesterday
```

---

## Summary

This system turns the coach from a write-only logger into a full data agent.
The key pieces are:

1. **New response types** in the coach protocol (edit, delete, backdate)
2. **System prompt additions** teaching the coach to interpret corrections
3. **Entry matching logic** to find what the user is referring to
4. **Context injection** so the coach knows what's already logged
5. **UI support** for manual edits as a fallback
6. **Confirmation pattern** so users always see what changed
