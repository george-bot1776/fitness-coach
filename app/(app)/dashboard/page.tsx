import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import type { Profile, FoodLog, ActivityLog, WeightLog } from '@/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile?.setup_complete) redirect('/setup')

  // Use Vercel's IP-based timezone header so server date matches user's local date.
  // Falls back to UTC locally (dev server runs in local OS timezone anyway).
  const headersList = await headers()
  const timezone = headersList.get('x-vercel-ip-timezone') ?? 'UTC'
  const today = new Date().toLocaleDateString('en-CA', { timeZone: timezone })

  const since30 = new Date()
  since30.setDate(since30.getDate() - 30)
  const since30str = since30.toLocaleDateString('en-CA', { timeZone: timezone })

  const [{ data: foodLogs }, { data: activityLogs }, { data: weightLog }, { data: weightHistory }] = await Promise.all([
    supabase.from('food_logs').select('*').eq('user_id', user.id).eq('session_date', today).order('created_at'),
    supabase.from('activity_logs').select('*').eq('user_id', user.id).eq('session_date', today).order('created_at'),
    supabase.from('weight_logs').select('*').eq('user_id', user.id).eq('logged_date', today).single(),
    supabase.from('weight_logs').select('*').eq('user_id', user.id)
      .gte('logged_date', since30str)
      .order('logged_date', { ascending: true }),
  ])

  return (
    <DashboardShell
      profile={profile as Profile}
      userId={user.id}
      initialFoodLogs={(foodLogs ?? []) as FoodLog[]}
      initialActivityLogs={(activityLogs ?? []) as ActivityLog[]}
      initialWeightLbs={weightLog?.weight_lbs ?? null}
      initialWeightHistory={(weightHistory ?? []) as WeightLog[]}
    />
  )
}
