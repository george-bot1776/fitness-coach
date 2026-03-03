import type { Coach } from '@/types'

interface Props {
  role: 'user' | 'coach'
  text: string
  imageUrl?: string
  isError?: boolean
  isLoading?: boolean
  coach: Coach
}

export function MessageBubble({ role, text, imageUrl, isError, isLoading, coach }: Props) {
  if (role === 'coach') {
    return (
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, maxWidth: '88%', alignSelf: 'flex-start' }}
           className="animate-fc-msg-in">
        {/* Coach avatar */}
        <div style={{
          width: 28, height: 28, borderRadius: 10,
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, flexShrink: 0,
        }}>
          {coach.emoji}
        </div>
        <div style={{
          padding: '12px 16px',
          borderRadius: '18px 18px 18px 4px',
          background: isError
            ? 'rgba(255,68,68,0.1)'
            : 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 100%)',
          border: `1px solid ${isError ? 'rgba(255,68,68,0.3)' : 'rgba(255,255,255,0.06)'}`,
          fontSize: 14,
          lineHeight: 1.55,
          color: 'rgba(255,255,255,0.85)',
          fontFamily: 'var(--font-dm-sans)',
        }}>
          {imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="food" style={{ borderRadius: 8, marginBottom: 8, maxWidth: 180, display: 'block' }} />
          )}
          {isLoading ? (
            <span style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '2px 0' }}>
              <span className="typing-dot" style={{ background: coach.color }} />
              <span className="typing-dot" style={{ background: coach.color }} />
              <span className="typing-dot" style={{ background: coach.color }} />
            </span>
          ) : (
            <p style={{ margin: 0 }}>{text}</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', maxWidth: '88%', alignSelf: 'flex-end' }}
         className="animate-fc-msg-in">
      <div style={{
        padding: '12px 16px',
        borderRadius: '18px 18px 4px 18px',
        background: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.08)',
        fontSize: 14,
        lineHeight: 1.55,
        color: '#F1F1F1',
        fontFamily: 'var(--font-dm-sans)',
        fontWeight: 500,
      }}>
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="food" style={{ borderRadius: 8, marginBottom: 8, maxWidth: 180, display: 'block' }} />
        )}
        <p style={{ margin: 0 }}>{text}</p>
      </div>
    </div>
  )
}
