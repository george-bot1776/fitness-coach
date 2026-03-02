import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SetupWizard } from '@/components/setup/SetupWizard'

export default async function SetupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('setup_complete')
    .eq('id', user.id)
    .single()

  if (profile?.setup_complete) redirect('/dashboard')

  return <SetupWizard userId={user.id} />
}
