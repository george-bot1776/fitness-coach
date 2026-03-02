import { CLASSIFIER_SYSTEM } from '@/lib/prompts'
import type { ChatMessage } from '@/types'

// ---- Rate Limiting (per user ID) ----------------------------
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 30
const RATE_WINDOW_MS = 60 * 1000

export function checkRateLimit(userId: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const entry = rateLimitStore.get(userId)

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(userId, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return { allowed: true }
  }

  if (entry.count >= RATE_LIMIT) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) }
  }

  entry.count += 1
  return { allowed: true }
}

// ---- Input Validation ----------------------------------------
const MAX_MESSAGES = 50
const MAX_CONTENT_CHARS = 2000

export function validateMessages(messages: ChatMessage[]): string | null {
  if (messages.length > MAX_MESSAGES) return `Too many messages (max ${MAX_MESSAGES})`
  for (const msg of messages) {
    if (!msg.role || !msg.content) return 'Each message must have role and content'
    const text =
      typeof msg.content === 'string'
        ? msg.content
        : msg.content
            .filter((b) => b.type === 'text')
            .map((b) => b.text ?? '')
            .join('')
    if (text.length > MAX_CONTENT_CHARS) return `Message too long (max ${MAX_CONTENT_CHARS} chars)`
  }
  return null
}

// ---- Topic Classifier ----------------------------------------
export async function classifyMessage(
  content: ChatMessage['content'],
  apiKey: string
): Promise<{ allowed: boolean; reason?: string }> {
  const text =
    typeof content === 'string'
      ? content
      : content
          .filter((b) => b.type === 'text')
          .map((b) => b.text ?? '')
          .join(' ')

  if (!text.trim()) return { allowed: true } // image-only passes through

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 50,
        system: CLASSIFIER_SYSTEM,
        messages: [{ role: 'user', content: text.slice(0, 500) }],
      }),
    })

    if (!response.ok) return { allowed: true } // fail open

    const data = await response.json()
    const raw = data.content?.[0]?.text?.trim() ?? '{"allowed":true}'
    return JSON.parse(raw)
  } catch {
    return { allowed: true } // fail open
  }
}
