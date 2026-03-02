import { MacroRing } from './MacroRing'
import { SummaryCard } from './SummaryCard'
import type { FoodItem, DailySummary, Coach } from '@/types'

interface Props {
  foodLog: FoodItem[]
  dailySummary: DailySummary | null
  dinnerSuggestion: string | null
  coach: Coach
  calorieTarget: number
}

export function TodayTab({ foodLog, dailySummary, dinnerSuggestion, coach, calorieTarget }: Props) {
  const totals = foodLog.reduce(
    (acc, f) => ({ protein: acc.protein + f.protein, carbs: acc.carbs + f.carbs, fat: acc.fat + f.fat }),
    { protein: 0, carbs: 0, fat: 0 }
  )
  const targets = {
    protein: Math.round((calorieTarget * 0.30) / 4),
    carbs: Math.round((calorieTarget * 0.45) / 4),
    fat: Math.round((calorieTarget * 0.25) / 9),
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {dailySummary && (
        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--fc-text-dim)' }}>
            Daily Summary
          </span>
          <SummaryCard summary={dailySummary} />
        </div>
      )}

      <div className="space-y-2">
        <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--fc-text-dim)' }}>
          Macros
        </span>
        <div className="grid grid-cols-3 gap-2.5">
          <MacroRing label="Protein" value={totals.protein} target={targets.protein} color={coach.color} />
          <MacroRing label="Carbs" value={totals.carbs} target={targets.carbs} color={coach.color} />
          <MacroRing label="Fat" value={totals.fat} target={targets.fat} color={coach.color} />
        </div>
      </div>

      {dinnerSuggestion && (
        <div className="rounded-2xl p-4" style={{ background: 'var(--fc-surface2)', border: `1px solid ${coach.color}` }}>
          <div className="text-[11px] font-bold uppercase tracking-widest mb-1.5"
               style={{ color: coach.color }}>
            🍽 Tonight&apos;s Suggestion
          </div>
          <p className="text-sm leading-relaxed">{dinnerSuggestion}</p>
        </div>
      )}

      <div className="space-y-2">
        <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--fc-text-dim)' }}>
          Food Log
        </span>
        {foodLog.length === 0 ? (
          <div className="text-center py-6 text-sm" style={{ color: 'var(--fc-text-muted)' }}>
            No foods logged yet — tell your coach what you ate!
          </div>
        ) : (
          foodLog.map((food, i) => (
            <div key={i} className="flex justify-between items-center px-3.5 py-3 rounded-xl animate-fc-fade-up"
                 style={{ background: 'var(--fc-surface2)', border: '1px solid var(--fc-border)' }}>
              <div>
                <div className="text-sm font-semibold">{food.name}</div>
                <div className="text-[11px] mt-0.5" style={{ color: 'var(--fc-text-dim)', fontFamily: 'var(--font-jetbrains-mono)' }}>
                  {food.protein}p · {food.carbs}c · {food.fat}f
                </div>
              </div>
              <span className="text-sm font-semibold" style={{ fontFamily: 'var(--font-jetbrains-mono)', color: coach.color }}>
                {food.calories} kcal
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
