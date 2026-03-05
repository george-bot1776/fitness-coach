import webpush from 'web-push'

export async function sendPush(
  subscription: webpush.PushSubscription,
  payload: { title: string; body: string; url: string }
) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )
  return webpush.sendNotification(subscription, JSON.stringify(payload))
}

const STREAK_SAVER_MESSAGES: Record<string, string[]> = {
  aria: [
    "Hey — you haven't logged today yet 🌸 A few minutes now keeps your streak alive.",
    "I noticed you haven't checked in today. No pressure, but your streak is waiting for you.",
    "One small log is all it takes. You've been showing up — don't let today be the day you don't. 💛",
    "Today isn't over yet. Log something, anything. Your consistency is your superpower.",
  ],
  dre: [
    "Don't let today slide. Log it. Streak's on the line.",
    "Nothing logged yet? That's not like you. Two minutes. Get it done.",
    "Your streak doesn't care about your excuse. Log it.",
    "End of day check — you've got nothing logged. Fix that. Now.",
  ],
  chen: [
    "Consistent logging is the #1 predictor of progress. Two minutes. Do it.",
    "No data, no insight. Log today's intake — your progress depends on accurate tracking.",
    "Logging gaps compound. One missed day becomes a pattern. Close the loop now.",
    "Your physiological data for today is incomplete. A few inputs now preserves your trend line.",
  ],
  kai: [
    "HEY. NOTHING LOGGED YET. YOUR STREAK IS ON THE LINE. LET'S GO ⚡",
    "BESTIE. THE APP IS WAITING. YOU ARE THE MAIN CHARACTER. LOG IT 🔥💪",
    "okay but we are NOT ending today without a log. NOT IN THIS ERA. GET IN HERE ⚡",
    "YOU'VE BEEN SO CONSISTENT AND I WILL NOT LET TODAY BE THE DAY. LOG SOMETHING. ANYTHING. NOW 🏆",
  ],
}

const MORNING_MESSAGES: Record<string, string[]> = {
  aria: [
    "Good morning 🌸 What's one small intention you're setting for food today?",
    "New day, fresh start. I'm here when you're ready to log your first meal.",
    "Morning! How are you feeling today? Let's make this a great one for your body.",
    "Today is a new page. Whatever happened yesterday, this morning is yours. 💛",
  ],
  dre: [
    "Morning. Plan your meals or plan to fail. Simple as that.",
    "New day. What's the goal today — hit protein, hit calories, or both? Set it now.",
    "You slept. Now it's time to execute. Log your breakfast the second you eat it.",
    "Good morning. Today's a chance to be better than yesterday. Don't waste it.",
  ],
  chen: [
    "Morning. Breakfast within 90 minutes of waking optimizes cortisol response. Worth noting.",
    "Good morning. Start logging early — it's the strongest predictor of full-day accuracy.",
    "Early logging correlates with better macro adherence across the day. Start now.",
    "Your compliance window opens now. Log breakfast within the hour for optimal tracking.",
  ],
  kai: [
    "GOOD MORNING LEGEND ⚡ TODAY IS YOUR DAY. LOG THAT BREAKFAST. WE ARE BUILT DIFFERENT 🔥",
    "RISE AND GRIND BESTIE 💪 THE APP IS READY. YOU ARE READY. LET'S EAT (and log it) 🏆",
    "morning champion ⚡ first log of the day hits different. make it count. no cap.",
    "WAKEY WAKEY 🔥 NEW DAY = NEW STREAK OPPORTUNITY. YOU ARE IN YOUR CONSISTENCY ERA. LET'S GO",
  ],
}

export function getCoachMessage(coachId: string, type: 'streak_saver' | 'morning'): string {
  const map = type === 'streak_saver' ? STREAK_SAVER_MESSAGES : MORNING_MESSAGES
  const messages = map[coachId] ?? map['aria']
  return messages[Math.floor(Math.random() * messages.length)]
}
