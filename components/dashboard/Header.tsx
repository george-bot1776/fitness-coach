import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import type { Coach } from '@/types'

interface Props {
  coach: Coach
  caloriesEaten: number
  caloriesBurned: number
  calorieTarget: number
}

export function Header({ coach, caloriesEaten, caloriesBurned, calorieTarget }: Props) {
  const adjusted = calorieTarget + caloriesBurned
  const remaining = adjusted - caloriesEaten
  const pct = Math.min(100, (caloriesEaten / adjusted) * 100)
  const isOver = remaining < 0

  return (
    <div>
      <div className="flex items-center gap-2.5 px-4 py-3"
           style={{ background: 'var(--fc-surface)', borderBottom: '1px solid var(--fc-border)' }}>
        <span className="text-2xl">{coach.emoji}</span>
        <div className="flex flex-col flex-1 min-w-0">
          <span className="font-bold text-base leading-none">{coach.name}</span>
          <span className="text-[11px] mt-0.5" style={{ color: 'var(--fc-text-dim)', fontFamily: 'var(--font-jetbrains-mono)' }}>
            {coach.modeLabel}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {caloriesBurned > 0 && (
            <Badge style={{ background: 'rgba(34,197,94,0.15)', color: 'var(--fc-success)', border: 'none', fontFamily: 'var(--font-jetbrains-mono)', fontSize: '11px' }}>
              +{caloriesBurned} burned
            </Badge>
          )}
          <Badge style={{
            background: isOver ? 'rgba(239,68,68,0.15)' : `${coach.color}22`,
            color: isOver ? 'var(--fc-danger)' : coach.color,
            border: 'none',
            fontFamily: 'var(--font-jetbrains-mono)',
            fontSize: '12px',
            fontWeight: 600,
          }}>
            {isOver ? `${Math.abs(remaining)} over` : `${remaining} kcal left`}
          </Badge>
        </div>
      </div>
      <Progress
        value={pct}
        className="h-[3px] rounded-none"
        style={{ background: 'var(--fc-surface3)' }}
      />
    </div>
  )
}
