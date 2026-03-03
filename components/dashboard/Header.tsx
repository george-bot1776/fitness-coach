import Link from 'next/link'
import type { Coach } from '@/types'

interface Props {
  coach: Coach
  caloriesEaten: number
  caloriesBurned: number
  calorieTarget: number
  activeTab: string
  onTabChange: (tab: string) => void
  streaks: { logging: number; protein: number }
}

export function Header({ coach, caloriesEaten, caloriesBurned, calorieTarget, activeTab, onTabChange, streaks }: Props) {
  const adjusted = calorieTarget + caloriesBurned
  const remaining = adjusted - caloriesEaten
  const pct = Math.min(1, caloriesEaten / adjusted)
  const isOver = remaining < 0

  const barColor = pct > 0.9 ? '#FF4444' : pct > 0.7 ? '#FFB020' : coach.gradient

  return (
    <div style={{ background: coach.headerGradient, flexShrink: 0 }}>
      {/* Coach identity row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, flexShrink: 0,
          }}>
            {coach.emoji}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, lineHeight: 1.2, color: '#F1F1F1', fontFamily: 'var(--font-dm-sans)' }}>
              {coach.name}
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: coach.color, letterSpacing: '0.03em', opacity: 0.9, fontFamily: 'var(--font-dm-sans)' }}>
              {coach.modeLabel}
            </div>
          </div>

          {/* Streak badges */}
          <div style={{ display: 'flex', gap: 6 }}>
            {streaks.logging >= 3 && (
              <div className="animate-pulse" style={{
                padding: '3px 8px', borderRadius: 20,
                background: 'rgba(255,107,43,0.15)',
                border: '1px solid rgba(255,107,43,0.3)',
                fontSize: 11, fontWeight: 700, color: '#FF6B2B',
                display: 'flex', alignItems: 'center', gap: 3,
                fontFamily: 'var(--font-space-mono)',
              }}>
                🔥{streaks.logging}
              </div>
            )}
            {streaks.protein >= 3 && (
              <div style={{
                padding: '3px 8px', borderRadius: 20,
                background: 'rgba(61,220,132,0.1)',
                border: '1px solid rgba(61,220,132,0.25)',
                fontSize: 11, fontWeight: 700, color: '#3DDC84',
                display: 'flex', alignItems: 'center', gap: 3,
                fontFamily: 'var(--font-space-mono)',
              }}>
                💪{streaks.protein}
              </div>
            )}
          </div>
        </div>

        {/* Stat pills + settings */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {caloriesBurned > 0 && (
            <div style={{
              padding: '5px 10px', borderRadius: 20,
              background: 'rgba(61,220,132,0.1)',
              border: '1px solid rgba(61,220,132,0.2)',
              fontFamily: 'var(--font-space-mono)', fontSize: 11, fontWeight: 700, color: '#3DDC84',
            }}>
              +{caloriesBurned} burned
            </div>
          )}
          <div style={{
            padding: '5px 10px', borderRadius: 20,
            background: isOver ? 'rgba(255,68,68,0.1)' : `${coach.accentGlow}`,
            border: `1px solid ${isOver ? 'rgba(255,68,68,0.3)' : coach.color + '33'}`,
            fontFamily: 'var(--font-space-mono)', fontSize: 11, fontWeight: 700,
            color: isOver ? '#FF4444' : coach.color,
          }}>
            {isOver ? `${Math.abs(remaining)} over` : `${remaining} left`}
          </div>

          <Link href="/settings" style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, color: 'rgba(255,255,255,0.45)',
            textDecoration: 'none', flexShrink: 0,
          }}>
            ⚙
          </Link>
        </div>
      </div>

      {/* Calorie progress bar */}
      <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', margin: '0 20px', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${Math.min(pct * 100, 100)}%`,
          borderRadius: 2,
          background: barColor,
          transition: 'width 1s ease',
        }} />
      </div>

      {/* Tab navigation */}
      <div style={{ display: 'flex', padding: '12px 12px 0' }}>
        {['coach', 'activity', 'today', 'history'].map(tab => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            style={{
              flex: 1,
              padding: '10px 8px',
              fontSize: 13,
              fontWeight: activeTab === tab ? 700 : 500,
              color: activeTab === tab ? '#F1F1F1' : 'rgba(255,255,255,0.35)',
              background: activeTab === tab ? 'rgba(255,255,255,0.06)' : 'transparent',
              border: 'none',
              borderRadius: '10px 10px 0 0',
              cursor: 'pointer',
              textTransform: 'capitalize',
              fontFamily: 'var(--font-dm-sans)',
              transition: 'all 0.2s ease',
              position: 'relative',
            }}
          >
            {tab}
            {activeTab === tab && (
              <div style={{
                position: 'absolute', bottom: 0, left: '50%',
                transform: 'translateX(-50%)',
                width: 20, height: 2, borderRadius: 1,
                background: coach.color,
              }} />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
