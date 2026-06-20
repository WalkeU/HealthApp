import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export default function StatCard({ label, value, unit, trend, sub }) {
  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus
  const trendClass = trend > 0 ? 'text-accent' : trend < 0 ? 'text-danger' : 'text-ink-3'

  return (
    <div className="bg-card border border-border rounded px-[18px] py-4 flex flex-col gap-1">
      <div className="text-[10px] font-semibold tracking-[0.1em] uppercase text-ink-3 mb-1">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className="text-[28px] font-bold text-ink leading-none tracking-[-0.02em]">{value ?? '—'}</span>
        {unit && <span className="text-[11px] text-ink-2 font-medium">{unit}</span>}
      </div>
      <div className="flex items-center gap-1.5 mt-1">
        {trend != null && (
          <span className={`flex items-center ${trendClass}`}>
            <TrendIcon size={11} />
          </span>
        )}
        {sub && <span className="text-[11px] text-ink-3">{sub}</span>}
      </div>
    </div>
  )
}
