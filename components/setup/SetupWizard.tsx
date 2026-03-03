'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { COACHES } from '@/lib/coaches'
import { saveProfile } from '@/lib/memory'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import type { Profile } from '@/types'

interface Props { userId: string }

type Goal = Profile['goal']
type Baseline = Profile['baseline']
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

interface OptionBtnProps {
  label: string
  sub?: string
  selected: boolean
  onClick: () => void
  accentColor?: string
}

function OptionBtn({ label, sub, selected, onClick, accentColor = 'var(--fc-coach-accent)' }: OptionBtnProps) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-2xl px-4 py-3.5 text-left transition-all"
      style={{
        background: selected ? `${accentColor}18` : 'var(--fc-surface2)',
        border: `2px solid ${selected ? accentColor : 'var(--fc-border)'}`,
        color: 'var(--fc-text)',
      }}
    >
      <span className="font-semibold text-sm">{label}</span>
      {sub && <span className="block text-xs mt-0.5" style={{ color: 'var(--fc-text-dim)' }}>{sub}</span>}
    </button>
  )
}

export function SetupWizard({ userId }: Props) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [shake, setShake] = useState(false)
  const [loading, setLoading] = useState(false)

  const [name, setName] = useState('')
  const [goal, setGoal] = useState<Goal>(null)
  const [baseline, setBaseline] = useState<Baseline>(null)
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(null)
  const [coachId, setCoachId] = useState('aria')

  function triggerShake() {
    setShake(true)
    setTimeout(() => setShake(false), 400)
  }

  function next(canProceed: boolean) {
    if (!canProceed) { triggerShake(); return }
    setStep(s => s + 1)
  }

  async function handleFinish() {
    setLoading(true)
    const calorieTarget = deriveCalorieTarget(goal, activityLevel)
    await saveProfile(userId, {
      name,
      goal,
      baseline,
      activity_level: activityLevel,
      calorie_target: calorieTarget,
      coach_id: coachId,
      setup_complete: true,
    })
    router.push('/dashboard')
    router.refresh()
  }

  const coach = COACHES[coachId]
  const totalSteps = 5

  return (
    <div className="flex min-h-screen items-center justify-center px-4"
         style={{ background: 'var(--fc-bg)' }}>
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="mb-6 text-center animate-fc-fade-up">
          <div className="text-5xl mb-3">🏋️</div>
          <h1 className="text-2xl font-extrabold" style={{ fontFamily: 'var(--font-syne)' }}>
            Fitness Coach AI
          </h1>
          {/* Step dots */}
          <div className="flex justify-center gap-1.5 mt-4">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all"
                style={{
                  width: i + 1 === step ? '20px' : '6px',
                  height: '6px',
                  background: i + 1 <= step ? 'var(--fc-coach-accent)' : 'var(--fc-surface3)',
                }}
              />
            ))}
          </div>
        </div>

        {/* Step 1 — Name */}
        {step === 1 && (
          <Card className={`animate-fc-fade-up ${shake ? 'animate-fc-shake' : ''}`}
                style={{ background: 'var(--fc-surface)', border: '1px solid var(--fc-border)' }}>
            <CardContent className="pt-6 space-y-5">
              <p className="font-bold text-lg" style={{ fontFamily: 'var(--font-syne)' }}>
                What&apos;s your name?
              </p>
              <Input
                placeholder="First name"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && next(!!name.trim())}
                autoFocus
                style={{ background: 'var(--fc-surface2)', border: '1px solid var(--fc-border)', color: 'var(--fc-text)' }}
              />
              <Button className="w-full font-bold" onClick={() => next(!!name.trim())}
                      style={{ background: 'var(--fc-coach-accent)', color: '#000' }}>
                Continue →
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2 — Goal */}
        {step === 2 && (
          <div className={`animate-fc-fade-up space-y-3 ${shake ? 'animate-fc-shake' : ''}`}>
            <p className="font-bold text-lg px-1" style={{ fontFamily: 'var(--font-syne)' }}>
              What&apos;s your main goal, {name}?
            </p>
            <OptionBtn label="Lose weight" selected={goal === 'lose_weight'} onClick={() => setGoal('lose_weight')} />
            <OptionBtn label="Build muscle" selected={goal === 'build_muscle'} onClick={() => setGoal('build_muscle')} />
            <OptionBtn label="Eat better" selected={goal === 'eat_better'} onClick={() => setGoal('eat_better')} />
            <OptionBtn label="More energy" selected={goal === 'more_energy'} onClick={() => setGoal('more_energy')} />
            <OptionBtn label="All of the above" selected={goal === 'all'} onClick={() => setGoal('all')} />
            <Button className="w-full font-bold mt-2" onClick={() => next(!!goal)}
                    style={{ background: 'var(--fc-coach-accent)', color: '#000' }}>
              Continue →
            </Button>
          </div>
        )}

        {/* Step 3 — Eating habits */}
        {step === 3 && (
          <div className={`animate-fc-fade-up space-y-3 ${shake ? 'animate-fc-shake' : ''}`}>
            <p className="font-bold text-lg px-1" style={{ fontFamily: 'var(--font-syne)' }}>
              How would you describe your current eating?
            </p>
            <OptionBtn label="Pretty good" sub="I mostly eat well, just need fine-tuning" selected={baseline === 'good'} onClick={() => setBaseline('good')} />
            <OptionBtn label="Hit or miss" sub="Good days and bad days" selected={baseline === 'hit_or_miss'} onClick={() => setBaseline('hit_or_miss')} />
            <OptionBtn label="Mostly bad" sub="Fast food, late nights, you know the deal" selected={baseline === 'mostly_bad'} onClick={() => setBaseline('mostly_bad')} />
            <OptionBtn label="No idea" sub="I genuinely don't track anything" selected={baseline === 'no_idea'} onClick={() => setBaseline('no_idea')} />
            <Button className="w-full font-bold mt-2" onClick={() => next(!!baseline)}
                    style={{ background: 'var(--fc-coach-accent)', color: '#000' }}>
              Continue →
            </Button>
          </div>
        )}

        {/* Step 4 — Activity level */}
        {step === 4 && (
          <div className={`animate-fc-fade-up space-y-3 ${shake ? 'animate-fc-shake' : ''}`}>
            <p className="font-bold text-lg px-1" style={{ fontFamily: 'var(--font-syne)' }}>
              How active are you week to week?
            </p>
            <OptionBtn label="Sedentary" sub="Desk job, minimal exercise" selected={activityLevel === 'sedentary'} onClick={() => setActivityLevel('sedentary')} />
            <OptionBtn label="Light" sub="Walk sometimes, maybe gym once a week" selected={activityLevel === 'light'} onClick={() => setActivityLevel('light')} />
            <OptionBtn label="Moderate" sub="Work out 3–4x a week" selected={activityLevel === 'moderate'} onClick={() => setActivityLevel('moderate')} />
            <OptionBtn label="Very active" sub="Train 5+ days, physical job, or both" selected={activityLevel === 'very_active'} onClick={() => setActivityLevel('very_active')} />
            <Button className="w-full font-bold mt-2" onClick={() => next(!!activityLevel)}
                    style={{ background: 'var(--fc-coach-accent)', color: '#000' }}>
              Continue →
            </Button>
          </div>
        )}

        {/* Step 5 — Pick coach */}
        {step === 5 && (
          <div className="animate-fc-fade-up space-y-4">
            <p className="font-bold text-lg px-1" style={{ fontFamily: 'var(--font-syne)' }}>
              Pick your coach, {name}.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {Object.values(COACHES).map(c => (
                <button
                  key={c.id}
                  onClick={() => setCoachId(c.id)}
                  className="rounded-2xl p-4 text-center transition-all"
                  style={{
                    background: coachId === c.id ? `${c.color}1a` : 'var(--fc-surface)',
                    border: `2px solid ${coachId === c.id ? c.color : 'var(--fc-border)'}`,
                    color: 'var(--fc-text)',
                  }}
                >
                  <div className="text-3xl mb-1">{c.emoji}</div>
                  <div className="font-bold text-sm">{c.name}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--fc-text-dim)' }}>{c.title}</div>
                  <div className="text-xs mt-1.5 italic" style={{ color: 'var(--fc-text-muted)' }}>&ldquo;{c.tagline}&rdquo;</div>
                </button>
              ))}
            </div>

            {/* Confirm summary */}
            <div className="rounded-xl px-4 py-3 space-y-2"
                 style={{ background: 'var(--fc-surface2)', border: '1px solid var(--fc-border)' }}>
              {[
                { label: 'Coach', value: `${coach.emoji} ${coach.name}` },
                { label: 'Goal', value: { lose_weight: 'Lose weight', build_muscle: 'Build muscle', eat_better: 'Eat better', more_energy: 'More energy', all: 'All of the above' }[goal!] ?? '' },
                { label: 'Activity', value: { sedentary: 'Sedentary', light: 'Light', moderate: 'Moderate', very_active: 'Very active' }[activityLevel!] ?? '' },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-center text-sm">
                  <span style={{ color: 'var(--fc-text-dim)' }}>{row.label}</span>
                  <span className="font-bold">{row.value}</span>
                </div>
              ))}
            </div>

            <Button className="w-full font-bold" onClick={handleFinish} disabled={loading}
                    style={{ background: 'var(--fc-coach-accent)', color: '#000' }}>
              {loading ? 'Setting up…' : "Let's Go 🚀"}
            </Button>
          </div>
        )}

      </div>
    </div>
  )
}
