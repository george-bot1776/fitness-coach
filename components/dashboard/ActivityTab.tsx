'use client'

import { useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { ActivityItem, Coach } from '@/types'

const ACTIVITY_TYPES = [
  { value: 'running',      label: '🏃 Running',      unit: 'minutes', icon: '🏃' },
  { value: 'walking',      label: '🚶 Walking',      unit: 'minutes', icon: '🚶' },
  { value: 'cycling',      label: '🚴 Cycling',      unit: 'minutes', icon: '🚴' },
  { value: 'swimming',     label: '🏊 Swimming',     unit: 'minutes', icon: '🏊' },
  { value: 'hiit',         label: '🔥 HIIT',         unit: 'minutes', icon: '🔥' },
  { value: 'weightlifting',label: '🏋️ Weightlifting',unit: 'minutes', icon: '🏋️' },
  { value: 'yoga',         label: '🧘 Yoga',         unit: 'minutes', icon: '🧘' },
  { value: 'steps',        label: '👟 Steps',        unit: 'steps',   icon: '👟' },
]

const BURN_TARGET = 800

interface Props {
  activityLog: ActivityItem[]
  caloriesBurned: number
  onLogActivity: (text: string) => void
  coach: Coach
}

export function ActivityTab({ activityLog, caloriesBurned, onLogActivity, coach }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [actType, setActType] = useState('running')
  const [amount, setAmount] = useState('')

  function handleLog() {
    if (!amount) return
    const type = ACTIVITY_TYPES.find(t => t.value === actType)!
    onLogActivity(`I just did ${amount} ${type.unit} of ${actType}`)
    setAmount('')
    setShowForm(false)
  }

  const burnPct = Math.min(1, caloriesBurned / BURN_TARGET)
  const burnRemaining = BURN_TARGET - caloriesBurned

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Burn target card */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 16,
        padding: '24px 20px',
        textAlign: 'center',
        animation: 'fc-fade-up 0.5s ease both',
      }}>
        <div style={{ marginBottom: 12 }}>
          <span style={{ fontFamily: 'var(--font-space-mono)', fontWeight: 700, fontSize: 42, color: coach.color, lineHeight: 1 }}>
            {caloriesBurned}
          </span>
          <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', marginLeft: 6 }}>
            / {BURN_TARGET} kcal
          </span>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: 10 }}>
          <div style={{
            height: '100%',
            width: `${burnPct * 100}%`,
            borderRadius: 3,
            background: coach.gradient,
            transition: 'width 1s ease',
          }} />
        </div>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
          {burnPct >= 1 ? '🔥 Daily burn goal crushed!' : `${burnRemaining} kcal to daily burn goal`}
        </span>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        {[
          { value: caloriesBurned, label: 'Burned' },
          { value: caloriesBurned, label: 'Earned Back' },
          { value: activityLog.length, label: 'Activities' },
        ].map((stat, i) => (
          <div key={i} style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 16,
            padding: '14px 10px',
            textAlign: 'center',
          }}>
            <div style={{ fontFamily: 'var(--font-space-mono)', fontWeight: 700, fontSize: 22, color: coach.color, marginBottom: 4, lineHeight: 1 }}>
              {stat.value}
            </div>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)' }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Log button */}
      <button
        onClick={() => setShowForm(v => !v)}
        style={{
          width: '100%',
          padding: 14,
          borderRadius: 14,
          background: showForm ? coach.accentGlow : 'transparent',
          border: `1.5px solid ${coach.color}`,
          color: coach.color,
          fontFamily: 'var(--font-dm-sans)',
          fontWeight: 700,
          fontSize: 14,
          cursor: 'pointer',
          transition: 'background 0.15s ease',
        }}
      >
        {showForm ? '✕ Cancel' : '+ Log Activity'}
      </button>

      {/* Log form */}
      {showForm && (
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 16,
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          animation: 'fc-fade-up 0.3s ease both',
        }}>
          <Select value={actType} onValueChange={setActType}>
            <SelectTrigger style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: '#F1F1F1', borderRadius: 10 }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={{ background: '#1a1c22', border: '1px solid rgba(255,255,255,0.08)' }}>
              {ACTIVITY_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              type="number"
              placeholder="30"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLog()}
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10,
                padding: '10px 14px',
                color: '#F1F1F1',
                fontSize: 14,
                fontFamily: 'var(--font-dm-sans)',
                outline: 'none',
              }}
            />
            <button
              onClick={handleLog}
              style={{
                padding: '10px 20px',
                borderRadius: 10,
                background: coach.gradient,
                border: 'none',
                color: '#fff',
                fontFamily: 'var(--font-dm-sans)',
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Log
            </button>
          </div>
        </div>
      )}

      {/* Activity log */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: 10 }}>
          Today&apos;s Activities
        </div>
        {activityLog.length === 0 ? (
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 16,
            padding: '32px 20px',
            textAlign: 'center',
            color: 'rgba(255,255,255,0.3)',
            fontSize: 14,
          }}>
            No movement yet today — even a 10-min walk counts 🔥
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {activityLog.map((act, i) => {
              const typeInfo = ACTIVITY_TYPES.find(t => act.label.toLowerCase().includes(t.value)) ?? ACTIVITY_TYPES[0]
              return (
                <div key={i} style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 16,
                  borderLeft: `3px solid ${coach.color}`,
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  animation: 'fc-msg-in 0.5s ease both',
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: coach.accentGlow,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, flexShrink: 0,
                  }}>
                    {typeInfo.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{act.label}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                      {act.value} {act.unit}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-space-mono)', fontWeight: 700, fontSize: 16, color: '#3DDC84' }}>
                      +{act.caloriesBurned}
                    </div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>kcal</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
