'use client'

interface Props {
  label: string
  value: number
  target: number
  color: string
}

export function MacroRing({ label, value, target, color }: Props) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0
  const circumference = 2 * Math.PI * 28
  const offset = circumference - (pct / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-1.5 rounded-2xl py-3.5 px-2"
         style={{ background: 'var(--fc-surface2)', border: '1px solid var(--fc-border)' }}>
      <span className="text-xs uppercase tracking-widest font-semibold"
            style={{ color: 'var(--fc-text-dim)', fontSize: '11px' }}>
        {label}
      </span>
      <div className="relative w-[68px] h-[68px]">
        <svg className="w-full h-full" viewBox="0 0 68 68" style={{ transform: 'rotate(-90deg)' }}>
          <circle className="ring-track" cx="34" cy="34" r="28" />
          <circle
            className="ring-fill"
            cx="34" cy="34" r="28"
            style={{ stroke: color, strokeDashoffset: offset }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-semibold" style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'var(--fc-text)' }}>
            {Math.round(value)}g
          </span>
          <span className="text-[9px]" style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'var(--fc-text-dim)' }}>
            / {target}g
          </span>
        </div>
      </div>
    </div>
  )
}
