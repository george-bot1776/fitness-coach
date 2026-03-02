import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import type { Profile, FoodLog, ActivityLog } from '@/types'

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

  const today = new Date().toISOString().split('T')[0]

  const [{ data: foodLogs }, { data: activityLogs }] = await Promise.all([
    supabase.from('food_logs').select('*').eq('user_id', user.id).eq('session_date', today).order('created_at'),
    supabase.from('activity_logs').select('*').eq('user_id', user.id).eq('session_date', today).order('created_at'),
  ])

  return (
    <DashboardShell
      profile={profile as Profile}
      userId={user.id}
      initialFoodLogs={(foodLogs ?? []) as FoodLog[]}
      initialActivityLogs={(activityLogs ?? []) as ActivityLog[]}
    />
  )
}
