'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { ActivityItem } from '@/types'

const ACTIVITY_TYPES = [
  { value: 'running', label: '🏃 Running', unit: 'minutes' },
  { value: 'walking', label: '🚶 Walking', unit: 'minutes' },
  { value: 'cycling', label: '🚴 Cycling', unit: 'minutes' },
  { value: 'swimming', label: '🏊 Swimming', unit: 'minutes' },
  { value: 'hiit', label: '🔥 HIIT', unit: 'minutes' },
  { value: 'weightlifting', label: '🏋️ Weightlifting', unit: 'minutes' },
  { value: 'yoga', label: '🧘 Yoga', unit: 'minutes' },
  { value: 'steps', label: '👟 Steps', unit: 'steps' },
]

interface Props {
  activityLog: ActivityItem[]
  caloriesBurned: number
  onLogActivity: (text: string) => void
}

export function ActivityTab({ activityLog, caloriesBurned, onLogActivity }: Props) {
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

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2.5">
        {[
          { val: caloriesBurned, key: 'kcal burned' },
          { val: caloriesBurned, key: 'kcal earned' },
          { val: activityLog.length, key: 'activities' },
        ].map((s, i) => (
          <div key={i} className="rounded-2xl p-3.5 text-center"
               style={{ background: 'var(--fc-surface2)', border: '1px solid var(--fc-border)' }}>
            <span className="block text-xl font-semibold"
                  style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'var(--fc-coach-accent)' }}>
              {s.val}
            </span>
            <span className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--fc-text-dim)' }}>
              {s.key}
            </span>
          </div>
        ))}
      </div>

      <Button
        variant="outline"
        className="w-full font-semibold"
        onClick={() => setShowForm(v => !v)}
        style={{ borderColor: 'var(--fc-coach-accent)', color: 'var(--fc-coach-accent)', background: 'transparent' }}
      >
        + Log Activity
      </Button>

      {showForm && (
        <div className="rounded-2xl p-4 space-y-3 animate-fc-fade-up"
             style={{ background: 'var(--fc-surface2)', border: '1px solid var(--fc-border)' }}>
          <Select value={actType} onValueChange={setActType}>
            <SelectTrigger style={{ background: 'var(--fc-surface3)', border: '1px solid var(--fc-border)', color: 'var(--fc-text)' }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={{ background: 'var(--fc-surface2)', border: '1px solid var(--fc-border)' }}>
              {ACTIVITY_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="30"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="flex-1"
              style={{ background: 'var(--fc-surface3)', border: '1px solid var(--fc-border)', color: 'var(--fc-text)' }}
            />
            <Button onClick={handleLog} style={{ background: 'var(--fc-coach-accent)', color: '#000' }}>
              Log
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--fc-text-dim)' }}>
          Activity Log
        </span>
        {activityLog.length === 0 ? (
          <div className="text-center py-6 text-sm" style={{ color: 'var(--fc-text-muted)' }}>
            No activities logged yet
          </div>
        ) : (
          activityLog.map((act, i) => (
            <div key={i} className="flex justify-between items-center px-3.5 py-3 rounded-xl animate-fc-fade-up"
                 style={{ background: 'var(--fc-surface2)', border: '1px solid var(--fc-border)' }}>
              <div>
                <div className="text-sm font-semibold">{act.label}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--fc-text-dim)', fontFamily: 'var(--font-jetbrains-mono)' }}>
                  {act.value} {act.unit}
                </div>
              </div>
              <span className="text-sm font-semibold" style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'var(--fc-success)' }}>
                +{act.caloriesBurned} kcal
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
