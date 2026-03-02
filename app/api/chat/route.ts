import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, validateMessages, classifyMessage } from '@/lib/guardrails'
import type { ChatMessage } from '@/types'

export async function POST(req: Request) {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { messages, system, isSummary } = body as {
    messages: ChatMessage[]
    system?: string
    isSummary?: boolean
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  if (!messages || !Array.isArray(messages)) {
    return Response.json({ error: 'messages array required' }, { status: 400 })
  }

  // Input validation
  const validationError = validateMessages(messages)
  if (validationError) {
    return Response.json({ error: validationError }, { status: 400 })
  }

  // Rate limit (per user, not IP — more fair for real users)
  const rl = checkRateLimit(user.id)
  if (!rl.allowed) {
    return Response.json(
      { error: `Too many requests. Try again in ${rl.retryAfter}s.` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  // Skip classifier for session summarization calls
  if (!isSummary) {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')
    if (lastUserMsg) {
      const classification = await classifyMessage(lastUserMsg.content, process.env.ANTHROPIC_API_KEY)
      if (!classification.allowed) {
        return Response.json({
          blocked: true,
          message: "I'm your fitness and wellness coach — I can't help with that one. Ask me about food, workouts, sleep, or habits and I'm all yours! 💪",
        })
      }
    }
  }

  // Normalize messages for vision support
  const normalizedMessages = messages.map((msg) => {
    if (typeof msg.content === 'string') {
      return { role: msg.role, content: [{ type: 'text', text: msg.content }] }
    }
    return msg
  })

  const anthropicBody: Record<string, unknown> = {
    model: isSummary ? 'claude-haiku-4-5-20251001' : 'claude-sonnet-4-20250514',
    max_tokens: isSummary ? 300 : 1000,
    messages: normalizedMessages,
  }
  if (system) anthropicBody.system = system

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(anthropicBody),
    })

    if (!response.ok) {
      return Response.json({ error: 'Coach is unavailable right now. Try again in a moment.' }, { status: response.status })
    }

    const data = await response.json()
    return Response.json(data)
  } catch (err) {
    console.error('Anthropic API error:', err)
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
