'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { COACHES } from '@/lib/coaches'
import { saveProfile } from '@/lib/memory'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'

interface Props { userId: string }

export function SetupWizard({ userId }: Props) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [shake, setShake] = useState(false)
  const [loading, setLoading] = useState(false)

  const [name, setName] = useState('')
  const [weight, setWeight] = useState('')
  const [targetLbs, setTargetLbs] = useState('')
  const [calories, setCalories] = useState('')
  const [coachId, setCoachId] = useState('aria')

  function triggerShake() {
    setShake(true)
    setTimeout(() => setShake(false), 400)
  }

  function handleStep1() {
    if (!name || !weight || !targetLbs || !calories) { triggerShake(); return }
    setStep(2)
  }

  function handleStep2() {
    setStep(3)
  }

  async function handleFinish() {
    setLoading(true)
    await saveProfile(userId, {
      name,
      current_weight: parseFloat(weight),
      target_lbs: parseFloat(targetLbs),
      calorie_target: parseInt(calories),
      coach_id: coachId,
      setup_complete: true,
    })
    router.push('/dashboard')
    router.refresh()
  }

  const coach = COACHES[coachId]

  return (
    <div className="flex min-h-screen items-center justify-center px-4"
         style={{ background: 'var(--fc-bg)' }}>
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center animate-fc-fade-up">
          <div className="text-5xl mb-3">🏋️</div>
          <h1 className="text-2xl font-extrabold" style={{ fontFamily: 'var(--font-syne)' }}>
            Fitness Coach AI
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--fc-text-dim)' }}>
            Your AI-powered nutrition &amp; fitness companion
          </p>
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <Card className={`animate-fc-fade-up ${shake ? 'animate-fc-shake' : ''}`}
                style={{ background: 'var(--fc-surface)', border: '1px solid var(--fc-border)' }}>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-1.5">
                <Label style={{ color: 'var(--fc-text-dim)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Your name</Label>
                <Input placeholder="First name" value={name} onChange={e => setName(e.target.value)}
                       style={{ background: 'var(--fc-surface2)', border: '1px solid var(--fc-border)', color: 'var(--fc-text)' }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label style={{ color: 'var(--fc-text-dim)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Current weight (lbs)</Label>
                  <Input type="number" placeholder="175" value={weight} onChange={e => setWeight(e.target.value)}
                         style={{ background: 'var(--fc-surface2)', border: '1px solid var(--fc-border)', color: 'var(--fc-text)' }} />
                </div>
                <div className="space-y-1.5">
                  <Label style={{ color: 'var(--fc-text-dim)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Goal: lose (lbs)</Label>
                  <Input type="number" placeholder="20" value={targetLbs} onChange={e => setTargetLbs(e.target.value)}
                         style={{ background: 'var(--fc-surface2)', border: '1px solid var(--fc-border)', color: 'var(--fc-text)' }} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label style={{ color: 'var(--fc-text-dim)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Daily calorie target</Label>
                <Input type="number" placeholder="1800" value={calories} onChange={e => setCalories(e.target.value)}
                       style={{ background: 'var(--fc-surface2)', border: '1px solid var(--fc-border)', color: 'var(--fc-text)' }} />
              </div>
              <Button className="w-full font-bold mt-2" onClick={handleStep1}
                      style={{ background: 'var(--fc-coach-accent)', color: '#000' }}>
                Choose Your Coach →
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="animate-fc-fade-up space-y-4">
            <p className="text-center text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--fc-text-dim)' }}>
              Pick your coaching style
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
            <Button className="w-full font-bold" onClick={handleStep2}
                    style={{ background: 'var(--fc-coach-accent)', color: '#000' }}>
              Continue →
            </Button>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <Card className="animate-fc-fade-up"
                style={{ background: 'var(--fc-surface)', border: '1px solid var(--fc-border)' }}>
            <CardContent className="pt-6 space-y-4">
              <p className="text-center text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--fc-text-dim)' }}>
                You&apos;re all set!
              </p>
              <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--fc-surface2)', border: '1px solid var(--fc-border)' }}>
                {[
                  { label: 'Name', value: name },
                  { label: 'Coach', value: `${coach.emoji} ${coach.name} — ${coach.title}` },
                  { label: 'Daily target', value: `${calories} kcal` },
                ].map(row => (
                  <div key={row.label} className="flex justify-between items-center">
                    <span className="text-sm" style={{ color: 'var(--fc-text-dim)' }}>{row.label}</span>
                    <span className="text-sm font-bold">{row.value}</span>
                  </div>
                ))}
              </div>
              <Button className="w-full font-bold" onClick={handleFinish} disabled={loading}
                      style={{ background: 'var(--fc-coach-accent)', color: '#000' }}>
                {loading ? 'Setting up…' : "Let's Go 🚀"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
