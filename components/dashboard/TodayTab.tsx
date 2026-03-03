'use client'

import { useState } from 'react'
import { MacroRing } from './MacroRing'
import { SummaryCard } from './SummaryCard'
import { saveWeightLog } from '@/lib/memory'
import type { FoodItem, DailySummary, Coach, WeightLog } from '@/types'

interface Props {
  foodLog: FoodItem[]
  dailySummary: DailySummary | null
  dinnerSuggestion: string | null
  coach: Coach
  calorieTarget: number
  userId: string
  weightLbs: number | null
  weightHistory: WeightLog[]
  onWeightSaved: (lbs: number) => void
}

function WeightSparkline({ history, color }: { history: WeightLog[]; color: string }) {
  if (history.length < 2) return null

  const W = 280
  const H = 48
  const pad = 4
  const weights = history.map(w => w.weight_lbs)
  const min = Math.min(...weights)
  const max = Math.max(...weights)
  const range = max - min || 1

  const points = history.map((w, i) => {
    const x = pad + (i / (history.length - 1)) * (W - pad * 2)
    const y = H - pad - ((w.weight_lbs - min) / range) * (H - pad * 2)
    return `${x},${y}`
  })

  const first = weights[0]
  const last = weights[weights.length - 1]
  const delta = last - first
  const deltaStr = delta === 0 ? '—' : `${delta > 0 ? '+' : ''}${delta.toFixed(1)} lbs`
  const deltaColor = delta < 0 ? 'var(--fc-success)' : delta > 0 ? 'var(--fc-danger)' : 'var(--fc-text-dim)'

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: 'var(--fc-text-dim)' }}>
          {history.length} entries · {new Date(history[0].logged_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} → today
        </span>
        <span className="text-xs font-bold" style={{ color: deltaColor }}>{deltaStr}</span>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
        <polyline
          points={points.join(' ')}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.8"
        />
        {/* End dot */}
        {(() => {
          const last = points[points.length - 1].split(',')
          return <circle cx={last[0]} cy={last[1]} r="3" fill={color} />
        })()}
      </svg>
    </div>
  )
}

export function TodayTab({ foodLog, dailySummary, dinnerSuggestion, coach, calorieTarget, userId, weightLbs, weightHistory, onWeightSaved }: Props) {
  const [weightInput, setWeightInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const totals = foodLog.reduce(
    (acc, f) => ({ protein: acc.protein + f.protein, carbs: acc.carbs + f.carbs, fat: acc.fat + f.fat }),
    { protein: 0, carbs: 0, fat: 0 }
  )
  const targets = {
    protein: Math.round((calorieTarget * 0.30) / 4),
    carbs: Math.round((calorieTarget * 0.45) / 4),
    fat: Math.round((calorieTarget * 0.25) / 9),
  }

  async function handleLogWeight() {
    const lbs = parseFloat(weightInput)
    if (!lbs || lbs < 50 || lbs > 600) return
    setSaving(true)
    await saveWeightLog(userId, lbs)
    onWeightSaved(lbs)
    setWeightInput('')
    setSaving(false)
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">

      {/* Weight card */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--fc-text-dim)' }}>
            Weight
          </span>
          {weightHistory.length >= 2 && (
            <button
              onClick={() => setShowHistory(v => !v)}
              className="text-[11px] font-semibold"
              style={{ color: coach.color }}
            >
              {showHistory ? 'Hide history' : `${weightHistory.length}-day trend`}
            </button>
          )}
        </div>

        <div className="rounded-2xl px-4 py-3 space-y-3"
             style={{ background: 'var(--fc-surface2)', border: '1px solid var(--fc-border)' }}>
          <div className="flex items-center gap-3">
            <span className="text-xl">⚖️</span>
            {weightLbs ? (
              <div className="flex-1 flex items-center justify-between">
                <div>
                  <span className="text-lg font-bold" style={{ fontFamily: 'var(--font-jetbrains-mono)', color: coach.color }}>
                    {weightLbs} lbs
                  </span>
                  <span className="block text-xs" style={{ color: 'var(--fc-text-dim)' }}>Logged today</span>
                </div>
                {/* Allow re-logging */}
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Update"
                    value={weightInput}
                    onChange={e => setWeightInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleLogWeight()}
                    className="w-20 bg-transparent text-sm outline-none text-right"
                    style={{ color: 'var(--fc-text-dim)' }}
                  />
                  {weightInput && (
                    <button
                      onClick={handleLogWeight}
                      disabled={saving}
                      className="rounded-xl px-2.5 py-1 text-xs font-bold"
                      style={{ background: coach.color, color: '#000' }}
                    >
                      {saving ? '…' : 'Save'}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Enter weight (lbs)"
                  value={weightInput}
                  onChange={e => setWeightInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogWeight()}
                  className="flex-1 bg-transparent text-sm outline-none"
                  style={{ color: 'var(--fc-text)' }}
                />
                <button
                  onClick={handleLogWeight}
                  disabled={saving || !weightInput}
                  className="rounded-xl px-3 py-1.5 text-xs font-bold transition-opacity"
                  style={{ background: coach.color, color: '#000', opacity: !weightInput ? 0.4 : 1 }}
                >
                  {saving ? '…' : 'Log'}
                </button>
              </div>
            )}
          </div>

          {/* Sparkline */}
          {showHistory && weightHistory.length >= 2 && (
            <WeightSparkline history={weightHistory} color={coach.color} />
          )}
        </div>

        {/* History list */}
        {showHistory && weightHistory.length > 0 && (
          <div className="rounded-2xl overflow-hidden"
               style={{ border: '1px solid var(--fc-border)' }}>
            {[...weightHistory].reverse().slice(0, 14).map((w, i) => {
              const prev = [...weightHistory].reverse()[i + 1]
              const delta = prev ? w.weight_lbs - prev.weight_lbs : null
              return (
                <div key={w.id || w.logged_date}
                     className="flex justify-between items-center px-3.5 py-2.5"
                     style={{
                       background: i % 2 === 0 ? 'var(--fc-surface2)' : 'var(--fc-surface)',
                       borderBottom: i < Math.min(weightHistory.length, 14) - 1 ? '1px solid var(--fc-border)' : 'none',
                     }}>
                  <span className="text-xs" style={{ color: 'var(--fc-text-dim)' }}>
                    {new Date(w.logged_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                  <div className="flex items-center gap-2">
                    {delta !== null && (
                      <span className="text-[11px]" style={{ color: delta < 0 ? 'var(--fc-success)' : delta > 0 ? 'var(--fc-danger)' : 'var(--fc-text-muted)' }}>
                        {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                      </span>
                    )}
                    <span className="text-sm font-semibold" style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'var(--fc-text)' }}>
                      {w.weight_lbs} lbs
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

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
