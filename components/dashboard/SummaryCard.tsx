import type { DailySummary } from '@/types'

interface Props { summary: DailySummary }

export function SummaryCard({ summary }: Props) {
  return (
    <div className="rounded-2xl overflow-hidden"
         style={{ background: 'var(--fc-surface2)', border: '1px solid var(--fc-border)' }}>
      <div className="grid grid-cols-4" style={{ borderBottom: '1px solid var(--fc-border)' }}>
        {[
          { val: summary.totalCalories, key: 'eaten' },
          { val: summary.caloriesBurned, key: 'burned' },
          { val: summary.netCalories, key: 'net' },
          { val: `${summary.protein}g`, key: 'protein' },
        ].map((s, i) => (
          <div key={i} className="py-3.5 px-2 text-center"
               style={{ borderRight: i < 3 ? '1px solid var(--fc-border)' : 'none' }}>
            <span className="block text-base font-semibold"
                  style={{ fontFamily: 'var(--font-space-mono)', color: 'var(--fc-coach-accent)' }}>
              {s.val}
            </span>
            <span className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--fc-text-dim)' }}>
              {s.key}
            </span>
          </div>
        ))}
      </div>
      <div className="p-3 space-y-2">
        {[
          { label: 'Win', text: summary.highlight, bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)' },
          { label: 'Improve', text: summary.improvement, bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.2)' },
          { label: 'Tomorrow', text: summary.tomorrowTip, bg: 'rgba(99,179,237,0.08)', border: 'rgba(99,179,237,0.2)' },
        ].map(block => (
          <div key={block.label} className="flex gap-2.5 items-start rounded-xl px-3 py-2.5"
               style={{ background: block.bg, border: `1px solid ${block.border}` }}>
            <span className="text-[10px] font-bold uppercase tracking-wide min-w-[52px] pt-0.5"
                  style={{ color: 'var(--fc-text-dim)' }}>
              {block.label}
            </span>
            <span className="text-xs leading-relaxed" style={{ color: 'var(--fc-text)' }}>
              {block.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
