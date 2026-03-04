import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('push_subscriptions')
    .select('endpoint, morning_opt_in')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  return Response.json({ subscribed: !!data, morningOptIn: data?.morning_opt_in ?? false })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { subscription, timezone, morningOptIn } = body as {
    subscription: { endpoint: string; keys: Record<string, string> }
    timezone: string
    morningOptIn: boolean
  }

  if (!subscription?.endpoint) {
    return Response.json({ error: 'subscription required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        user_id: user.id,
        endpoint: subscription.endpoint,
        subscription,
        timezone: timezone || 'UTC',
        morning_opt_in: morningOptIn ?? false,
      },
      { onConflict: 'user_id,endpoint' }
    )

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}

export async function DELETE(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { endpoint } = body as { endpoint: string }

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', user.id)
    .eq('endpoint', endpoint)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}

export async function PATCH(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { endpoint, morningOptIn } = body as { endpoint: string; morningOptIn: boolean }

  const { error } = await supabase
    .from('push_subscriptions')
    .update({ morning_opt_in: morningOptIn })
    .eq('user_id', user.id)
    .eq('endpoint', endpoint)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
