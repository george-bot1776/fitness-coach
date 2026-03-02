import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
  return (
    <div className={`flex items-end gap-2 animate-fc-msg-in ${role === 'user' ? 'flex-row-reverse' : ''}`}>
      {role === 'coach' && (
        <Avatar className="w-8 h-8 shrink-0" style={{ background: 'var(--fc-surface3)' }}>
          <AvatarFallback style={{ background: 'var(--fc-surface3)', fontSize: '16px' }}>
            {coach.emoji}
          </AvatarFallback>
        </Avatar>
      )}
      <div
        className="max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed"
        style={
          role === 'user'
            ? { background: coach.color, color: '#000', borderBottomRightRadius: '4px', fontWeight: 500 }
            : {
                background: isError ? 'rgba(239,68,68,0.12)' : 'var(--fc-surface2)',
                border: `1px solid ${isError ? 'rgba(239,68,68,0.3)' : 'var(--fc-border)'}`,
                borderBottomLeftRadius: '4px',
                color: 'var(--fc-text)',
              }
        }
      >
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="food" className="rounded-lg mb-2 max-w-[180px]" />
        )}
        {isLoading ? (
          <span className="flex gap-1.5 items-center py-0.5">
            <span className="dot-pulse" />
            <span className="dot-pulse" />
            <span className="dot-pulse" />
          </span>
        ) : (
          <p>{text}</p>
        )}
      </div>
    </div>
  )
}
