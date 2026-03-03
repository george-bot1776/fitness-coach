-- ============================================================
-- Migration 002 — Goal context fields + Weight logs
-- Run this in your Supabase SQL editor
-- ============================================================

-- Add goal context columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS goal TEXT CHECK (goal IN ('lose_weight','build_muscle','eat_better','more_energy','all')),
  ADD COLUMN IF NOT EXISTS baseline TEXT CHECK (baseline IN ('good','hit_or_miss','mostly_bad','no_idea')),
  ADD COLUMN IF NOT EXISTS activity_level TEXT CHECK (activity_level IN ('sedentary','light','moderate','very_active'));

-- Weight logs
CREATE TABLE IF NOT EXISTS weight_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  logged_date DATE NOT NULL DEFAULT CURRENT_DATE,
  weight_lbs FLOAT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, logged_date)
);

CREATE INDEX IF NOT EXISTS weight_logs_user_date ON weight_logs(user_id, logged_date DESC);

ALTER TABLE weight_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "weight_logs_own" ON weight_logs FOR ALL USING (auth.uid() = user_id);
