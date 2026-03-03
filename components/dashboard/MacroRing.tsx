'use client'

import { useState, useEffect } from 'react'

interface Props {
  label: string
  value: number
  target: number
  color: string
  trackColor: string
  size?: number
  strokeWidth?: number
}

export function MacroRing({ label, value, target, color, trackColor, size = 80, strokeWidth = 5 }: Props) {
  const [progress, setProgress] = useState(0)
  const pct = target > 0 ? Math.min(1, value / target) : 0
  const radius = (size - strokeWidth * 2) / 2
  const circumference = 2 * Math.PI * radius

  useEffect(() => {
    const timer = setTimeout(() => setProgress(pct), 120)
    return () => clearTimeout(timer)
  }, [pct])

  const offset = circumference - progress * circumference
  const pctDisplay = Math.round(pct * 100)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      {/* Ring */}
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
          />
        </svg>
        {/* Center text */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontFamily: 'var(--font-space-mono)', fontWeight: 700, fontSize: size > 60 ? 15 : 12, color: '#F1F1F1', lineHeight: 1 }}>
            {Math.round(value)}g
          </span>
          <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 10, color: 'rgba(255,255,255,0.35)', lineHeight: 1, marginTop: 2 }}>
            / {target}g
          </span>
        </div>
      </div>
      <span style={{ fontFamily: 'var(--font-dm-sans)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.45)' }}>
        {label}
      </span>
      <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 10, fontWeight: 600, color: pct >= 0.8 ? '#3DDC84' : color }}>
        {pctDisplay}%
      </span>
    </div>
  )
}
