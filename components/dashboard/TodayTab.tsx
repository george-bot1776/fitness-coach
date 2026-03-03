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

function Sparkline({ data, width = 100, height = 30, color }: { data: number[]; width?: number; height?: number; color: string }) {
  if (data.length < 2) return null
  const pad = 2
  const min = Math.min(...data) - 0.5
  const max = Math.max(...data) + 0.5
  const range = max - min || 1

  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (width - pad * 2)
    const y = height - pad - ((v - min) / range) * (height - pad * 2)
    return [x, y] as [number, number]
  })

  const polylineStr = pts.map(p => p.join(',')).join(' ')
  const areaStr = `0,${height} ${polylineStr} ${width},${height}`
  const lastPt = pts[pts.length - 1]

  return (
    <svg width={width} height={height} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaStr} fill={`url(#sg-${color.replace('#', '')})`} />
      <polyline points={polylineStr} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lastPt[0]} cy={lastPt[1]} r={3} fill={color} />
    </svg>
  )
}

export function TodayTab({ foodLog, dailySummary, dinnerSuggestion, coach, calorieTarget, userId, weightLbs, weightHistory, onWeightSaved }: Props) {
  const [weightInput, setWeightInput] = useState('')
  const [saving, setSaving] = useState(false)

  const totals = foodLog.reduce(
    (acc, f) => ({ protein: acc.protein + f.protein, carbs: acc.carbs + f.carbs, fat: acc.fat + f.fat }),
    { protein: 0, carbs: 0, fat: 0 }
  )
  const targets = {
    protein: Math.round((calorieTarget * 0.30) / 4),
    carbs: Math.round((calorieTarget * 0.45) / 4),
    fat: Math.round((calorieTarget * 0.25) / 9),
  }
  const caloriesEaten = foodLog.reduce((s, f) => s + f.calories, 0)

  // Weekly weight delta
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
  const weekOldEntry = weightHistory.find(w => new Date(w.logged_date) >= weekAgo)
  const weekDelta = weightLbs && weekOldEntry ? weightLbs - weekOldEntry.weight_lbs : null

  async function handleLogWeight() {
    const lbs = parseFloat(weightInput)
    if (!lbs || lbs < 50 || lbs > 600) return
    setSaving(true)
    await saveWeightLog(userId, lbs)
    onWeightSaved(lbs)
    setWeightInput('')
    setSaving(false)
  }

  const cardStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 16,
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Weight card */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: 10 }}>
          Weight
        </div>
        <div style={{ ...cardStyle, padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'rgba(255,255,255,0.05)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
            }}>⚖️</div>
            {weightLbs ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontFamily: 'var(--font-space-mono)', fontWeight: 700, fontSize: 28, color: coach.color, lineHeight: 1 }}>
                    {weightLbs}
                  </span>
                  <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>lbs</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Logged today</span>
                  {weekDelta !== null && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: weekDelta <= 0 ? '#3DDC84' : '#FF4444' }}>
                      {weekDelta <= 0 ? '↓' : '↑'} {Math.abs(weekDelta).toFixed(1)} lbs this week
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <input
                  type="number"
                  placeholder="Log your weight (lbs)"
                  value={weightInput}
                  onChange={e => setWeightInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogWeight()}
                  style={{
                    background: 'none', border: 'none', outline: 'none',
                    color: '#F1F1F1', fontSize: 14, fontFamily: 'var(--font-dm-sans)',
                    width: 180,
                  }}
                />
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                  Step on the scale and let me know
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
            {weightHistory.length >= 2 && (
              <Sparkline data={weightHistory.map(w => w.weight_lbs)} color={coach.color} width={100} height={30} />
            )}
            {weightLbs ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="number"
                  placeholder="Update"
                  value={weightInput}
                  onChange={e => setWeightInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogWeight()}
                  style={{
                    width: 70, background: 'none', border: 'none', outline: 'none',
                    color: 'rgba(255,255,255,0.4)', fontSize: 12,
                    fontFamily: 'var(--font-dm-sans)', textAlign: 'right',
                  }}
                />
                {weightInput ? (
                  <button onClick={handleLogWeight} disabled={saving} style={{
                    padding: '4px 10px', borderRadius: 8,
                    background: coach.color, border: 'none',
                    color: '#000', fontSize: 11, fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'var(--font-dm-sans)',
                  }}>
                    {saving ? '…' : 'Save'}
                  </button>
                ) : (
                  <button style={{
                    padding: '4px 10px', borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.04)',
                    color: 'rgba(255,255,255,0.45)',
                    fontSize: 11, fontFamily: 'var(--font-dm-sans)', cursor: 'pointer',
                  }}>Update</button>
                )}
              </div>
            ) : weightInput ? (
              <button onClick={handleLogWeight} disabled={saving} style={{
                padding: '6px 14px', borderRadius: 8,
                background: coach.gradient, border: 'none',
                color: '#fff', fontSize: 12, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'var(--font-dm-sans)',
              }}>
                {saving ? '…' : 'Log'}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Daily summary */}
      {dailySummary && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: 10 }}>
            Daily Summary
          </div>
          <SummaryCard summary={dailySummary} />
        </div>
      )}

      {/* Macros */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: 10 }}>
          Macros
        </div>
        <div style={{ ...cardStyle, padding: '20px 10px', display: 'flex', justifyContent: 'space-around' }}>
          <MacroRing label="Protein" value={Math.round(totals.protein)} target={targets.protein} color={coach.color} trackColor={coach.ringTrack} size={80} />
          <MacroRing label="Carbs" value={Math.round(totals.carbs)} target={targets.carbs} color="#FFB020" trackColor="rgba(255,176,32,0.12)" size={80} />
          <MacroRing label="Fat" value={Math.round(totals.fat)} target={targets.fat} color="#8B5CF6" trackColor="rgba(139,92,246,0.12)" size={80} />
        </div>
      </div>

      {/* Food log */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)' }}>
            Food Log
          </span>
          <span style={{ fontFamily: 'var(--font-space-mono)', fontSize: 12, fontWeight: 700, color: coach.color }}>
            {caloriesEaten} / {calorieTarget} kcal
          </span>
        </div>
        {foodLog.length === 0 ? (
          <div style={{ ...cardStyle, padding: '32px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
            Tell your coach what you had — I&apos;ll track it for you
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {foodLog.map((food, i) => {
              const proteinRatio = food.protein / Math.max(food.protein + food.carbs + food.fat, 1)
              const isHighProtein = proteinRatio > 0.3
              return (
                <div key={i} style={{
                  ...cardStyle,
                  borderLeft: isHighProtein ? '3px solid #3DDC84' : '3px solid rgba(255,255,255,0.06)',
                  padding: '12px 16px',
                  display: 'flex', alignItems: 'center', gap: 12,
                  animation: 'fc-msg-in 0.5s ease both',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{food.name}</div>
                    <div style={{ display: 'flex', gap: 10, fontSize: 11 }}>
                      <span style={{ color: isHighProtein ? '#3DDC84' : 'rgba(255,255,255,0.35)' }}>{food.protein}p</span>
                      <span style={{ color: 'rgba(255,255,255,0.35)' }}>{food.carbs}c</span>
                      <span style={{ color: 'rgba(255,255,255,0.35)' }}>{food.fat}f</span>
                    </div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-space-mono)', fontWeight: 700, fontSize: 16, color: coach.color }}>
                    {food.calories}
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>kcal</div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Dinner suggestion */}
      {dinnerSuggestion && (
        <div style={{
          ...cardStyle,
          background: `linear-gradient(135deg, ${coach.accentGlow} 0%, rgba(255,255,255,0.02) 100%)`,
          border: `1px solid ${coach.color}22`,
          padding: '16px 18px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 16 }}>🍽️</span>
            <span style={{ fontWeight: 700, fontSize: 11, color: coach.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Dinner Suggestion
            </span>
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.5, color: 'rgba(255,255,255,0.75)', margin: 0 }}>
            {dinnerSuggestion}
          </p>
        </div>
      )}
    </div>
  )
}
