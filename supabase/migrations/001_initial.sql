-- ============================================================
-- Fitness Coach — Initial Schema
-- Run this in your Supabase SQL editor
-- ============================================================

-- Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  coach_id TEXT NOT NULL DEFAULT 'aria',
  current_weight FLOAT,
  target_lbs FLOAT,
  calorie_target INTEGER NOT NULL DEFAULT 2000,
  preferences TEXT[] DEFAULT '{}',
  coach_notes TEXT[] DEFAULT '{}',
  streaks JSONB NOT NULL DEFAULT '{"logging": 0, "protein": 0}',
  last_session TIMESTAMPTZ,
  setup_complete BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Episodes (Tier 2 memory — last 7 sessions per user)
CREATE TABLE IF NOT EXISTS episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  key_facts TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Exceptions (special occasions/events)
CREATE TABLE IF NOT EXISTS exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  expires TIMESTAMPTZ NOT NULL,
  follow_up BOOLEAN NOT NULL DEFAULT TRUE,
  follow_up_sent BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Food logs
CREATE TABLE IF NOT EXISTS food_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  name TEXT NOT NULL,
  calories INTEGER NOT NULL DEFAULT 0,
  protein FLOAT NOT NULL DEFAULT 0,
  carbs FLOAT NOT NULL DEFAULT 0,
  fat FLOAT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Activity logs
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  label TEXT NOT NULL,
  value FLOAT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'minutes',
  calories_burned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- Indexes ------------------------------------------------
CREATE INDEX IF NOT EXISTS episodes_user_id_created ON episodes(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS food_logs_user_date ON food_logs(user_id, session_date DESC);
CREATE INDEX IF NOT EXISTS activity_logs_user_date ON activity_logs(user_id, session_date DESC);
CREATE INDEX IF NOT EXISTS exceptions_user_expires ON exceptions(user_id, expires);

-- ---- Row Level Security -------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Profiles: user owns their own row
CREATE POLICY "profiles_own" ON profiles FOR ALL USING (auth.uid() = id);

-- Episodes: user owns their own rows
CREATE POLICY "episodes_own" ON episodes FOR ALL USING (auth.uid() = user_id);

-- Exceptions: user owns their own rows
CREATE POLICY "exceptions_own" ON exceptions FOR ALL USING (auth.uid() = user_id);

-- Food logs: user owns their own rows
CREATE POLICY "food_logs_own" ON food_logs FOR ALL USING (auth.uid() = user_id);

-- Activity logs: user owns their own rows
CREATE POLICY "activity_logs_own" ON activity_logs FOR ALL USING (auth.uid() = user_id);

-- ---- Auto-create profile on signup --------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
