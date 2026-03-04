import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfileEditForm } from '@/components/settings/ProfileEditForm'
import { NotificationToggle } from '@/components/notifications/NotificationToggle'
import type { Profile } from '@/types'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile?.setup_complete) redirect('/setup')

  return (
    <div className="space-y-6">
      <ProfileEditForm profile={profile as Profile} userId={user.id} />
      <NotificationToggle userId={user.id} />
    </div>
  )
}
