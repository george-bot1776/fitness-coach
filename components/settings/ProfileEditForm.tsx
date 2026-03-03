'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { COACHES } from '@/lib/coaches'
import { saveProfile } from '@/lib/memory'
import type { Profile } from '@/types'

type Goal = Profile['goal']
type ActivityLevel = Profile['activity_level']

function deriveCalorieTarget(goal: Goal, activityLevel: ActivityLevel): number {
  let base = 2000
  const activityAdj: Record<string, number> = {
    sedentary: -300, light: -100, moderate: 0, very_active: 300,
  }
  const goalAdj: Record<string, number> = {
    lose_weight: -400, build_muscle: 200, eat_better: 0, more_energy: 0, all: -200,
  }
  if (activityLevel) base += activityAdj[activityLevel] ?? 0
  if (goal) base += goalAdj[goal] ?? 0
  return Math.max(1200, Math.min(3000, base))
}

interface Props {
  profile: Profile
  userId: string
}

export function ProfileEditForm({ profile, userId }: Props) {
  const router = useRouter()
  const [name, setName] = useState(profile.name ?? '')
  const [goal, setGoal] = useState<Goal>(profile.goal)
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(profile.activity_level)
  const [coachId, setCoachId] = useState(profile.coach_id)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const selectedCoach = COACHES[coachId] ?? COACHES.aria

  useEffect(() => {
    document.documentElement.style.setProperty('--fc-coach-accent', selectedCoach.color)
    document.documentElement.style.setProperty('--fc-coach-gradient', selectedCoach.gradient)
  }, [selectedCoach.color, selectedCoach.gradient])

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    const calorieTarget = deriveCalorieTarget(goal, activityLevel)
    await saveProfile(userId, {
      name: name.trim(),
      goal,
      activity_level: activityLevel,
      calorie_target: calorieTarget,
      coach_id: coachId,
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => {
      router.push('/dashboard')
      router.refresh()
    }, 800)
  }

  function OptionBtn({ label, sub, selected, onClick }: { label: string; sub?: string; selected: boolean; onClick: () => void }) {
    return (
      <button
        onClick={onClick}
        style={{
          width: '100%',
          padding: '12px 16px',
          borderRadius: 14,
          textAlign: 'left',
          background: selected ? `${selectedCoach.color}18` : 'var(--fc-surface2)',
          border: `2px solid ${selected ? selectedCoach.color : 'var(--fc-border)'}`,
          color: 'var(--fc-text)',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          fontFamily: 'var(--font-dm-sans)',
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 14, display: 'block' }}>{label}</span>
        {sub && <span style={{ fontSize: 12, color: 'var(--fc-text-dim)', marginTop: 2, display: 'block' }}>{sub}</span>}
      </button>
    )
  }

  return (
    <div style={{
      maxWidth: 430, margin: '0 auto', background: 'var(--fc-bg)',
      minHeight: '100dvh', paddingBottom: 40,
      fontFamily: 'var(--font-dm-sans)',
    }}>
      {/* Header */}
      <div style={{ background: selectedCoach.headerGradient, padding: '20px 20px 16px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button
          onClick={() => router.push('/dashboard')}
          style={{
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 10, width: 36, height: 36,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--fc-text)', fontSize: 18, flexShrink: 0,
          }}
        >←</button>
        <div>
          <div style={{ fontWeight: 800, fontSize: 18, color: '#F1F1F1', fontFamily: 'var(--font-syne)' }}>Settings</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: selectedCoach.color, letterSpacing: '0.03em' }}>Profile &amp; Coach</div>
        </div>
      </div>

      <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 28 }}>

        {/* Name */}
        <section>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--fc-text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>
            Name
          </label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your name"
            style={{
              width: '100%', padding: '12px 14px',
              borderRadius: 14, fontSize: 15,
              background: 'var(--fc-surface2)', border: '1px solid var(--fc-border)',
              color: 'var(--fc-text)', outline: 'none',
              fontFamily: 'var(--font-dm-sans)',
              boxSizing: 'border-box',
            }}
          />
        </section>

        {/* Coach selection */}
        <section>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--fc-text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>
            Your Coach
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {Object.values(COACHES).map(c => (
              <button
                key={c.id}
                onClick={() => setCoachId(c.id)}
                style={{
                  padding: '14px 10px',
                  borderRadius: 16,
                  textAlign: 'center',
                  background: coachId === c.id ? `${c.color}1a` : 'var(--fc-surface)',
                  border: `2px solid ${coachId === c.id ? c.color : 'var(--fc-border)'}`,
                  color: 'var(--fc-text)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  fontFamily: 'var(--font-dm-sans)',
                }}
              >
                <div style={{ fontSize: 26, marginBottom: 4 }}>{c.emoji}</div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{c.name}</div>
                <div style={{ fontSize: 11, color: 'var(--fc-text-dim)', marginTop: 2 }}>{c.title}</div>
                <div style={{ fontSize: 10, color: 'var(--fc-text-muted)', marginTop: 6, fontStyle: 'italic', lineHeight: 1.3 }}>
                  &ldquo;{c.tagline}&rdquo;
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Goal */}
        <section>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--fc-text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>
            Main Goal
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <OptionBtn label="Lose weight" selected={goal === 'lose_weight'} onClick={() => setGoal('lose_weight')} />
            <OptionBtn label="Build muscle" selected={goal === 'build_muscle'} onClick={() => setGoal('build_muscle')} />
            <OptionBtn label="Eat better" selected={goal === 'eat_better'} onClick={() => setGoal('eat_better')} />
            <OptionBtn label="More energy" selected={goal === 'more_energy'} onClick={() => setGoal('more_energy')} />
            <OptionBtn label="All of the above" selected={goal === 'all'} onClick={() => setGoal('all')} />
          </div>
        </section>

        {/* Activity level */}
        <section>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--fc-text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>
            Activity Level
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <OptionBtn label="Sedentary" sub="Desk job, minimal exercise" selected={activityLevel === 'sedentary'} onClick={() => setActivityLevel('sedentary')} />
            <OptionBtn label="Light" sub="Walk sometimes, maybe gym once a week" selected={activityLevel === 'light'} onClick={() => setActivityLevel('light')} />
            <OptionBtn label="Moderate" sub="Work out 3–4x a week" selected={activityLevel === 'moderate'} onClick={() => setActivityLevel('moderate')} />
            <OptionBtn label="Very active" sub="Train 5+ days, physical job, or both" selected={activityLevel === 'very_active'} onClick={() => setActivityLevel('very_active')} />
          </div>
        </section>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving || saved || !name.trim()}
          style={{
            width: '100%', padding: 15,
            borderRadius: 16, fontSize: 15, fontWeight: 700,
            background: saved ? '#3DDC84' : selectedCoach.color,
            color: '#000',
            border: 'none', cursor: saving || saved ? 'default' : 'pointer',
            opacity: !name.trim() ? 0.5 : 1,
            transition: 'all 0.2s ease',
            fontFamily: 'var(--font-dm-sans)',
          }}
        >
          {saved ? 'Saved ✓' : saving ? 'Saving…' : 'Save Changes'}
        </button>

      </div>
    </div>
  )
}
