import { createClient } from '@supabase/supabase-js'
import { sendPush, getCoachMessage } from '@/lib/push'
import type webpush from 'web-push'

export const maxDuration = 60

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select(`
      id,
      user_id,
      subscription,
      timezone,
      morning_opt_in,
      profiles!inner(coach_id)
    `)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  if (!subs?.length) return Response.json({ sent: 0 })

  const now = new Date()
  let sent = 0
  const expired: string[] = []

  for (const sub of subs) {
    const tz = sub.timezone || 'UTC'
    const localHour = parseInt(
      new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: tz }).format(now),
      10
    )

    const coachId = (sub.profiles as unknown as { coach_id: string })?.coach_id || 'aria'
    const pushSub = sub.subscription as webpush.PushSubscription

    if (localHour === 8 && sub.morning_opt_in) {
      const body = getCoachMessage(coachId, 'morning')
      try {
        await sendPush(pushSub, { title: 'Good Morning', body, url: '/dashboard' })
        sent++
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'statusCode' in err && (err as { statusCode: number }).statusCode === 410) {
          expired.push(sub.id)
        }
      }
    } else if (localHour === 19) {
      const today = new Date().toLocaleDateString('en-CA', { timeZone: tz })
      const { count } = await supabase
        .from('food_logs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', sub.user_id)
        .eq('session_date', today)

      if (count === 0) {
        const body = getCoachMessage(coachId, 'streak_saver')
        try {
          await sendPush(pushSub, { title: "Don't Break Your Streak", body, url: '/dashboard' })
          sent++
        } catch (err: unknown) {
          if (err && typeof err === 'object' && 'statusCode' in err && (err as { statusCode: number }).statusCode === 410) {
            expired.push(sub.id)
          }
        }
      }
    }
  }

  if (expired.length) {
    await supabase.from('push_subscriptions').delete().in('id', expired)
  }

  return Response.json({ sent })
}
