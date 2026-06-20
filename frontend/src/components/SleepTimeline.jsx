import { useFetch } from '../hooks/useFetch.js'
import { api } from '../api/client.js'
import Spinner from './ui/Spinner.jsx'

// activityLevel → label + color
const PHASE = {
  0: { label: 'Deep',  color: '#6366f1' },
  1: { label: 'Light', color: '#60a5fa' },
  2: { label: 'Awake', color: '#f59e0b' },
  3: { label: 'REM',   color: '#00ff87' },
}

function fmtGMT(str) {
  return new Date(str.replace(' ', 'T') + 'Z')
}

function fmtHour(date) {
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
}

export default function SleepTimeline({ date }) {
  const { data, loading } = useFetch(() => api.getSleepDetail(date), [date])

  if (loading) return <Spinner size={16} />

  const levels = data?.sleepLevels ?? []
  if (!levels.length) return (
    <div className="text-[11px] text-ink-3 py-3">
      No sleep phase data — will appear after next Garmin sync.
    </div>
  )

  const starts = levels.map(l => fmtGMT(l.startGMT).getTime())
  const ends   = levels.map(l => fmtGMT(l.endGMT).getTime())
  const tMin   = Math.min(...starts)
  const tMax   = Math.max(...ends)
  const span   = tMax - tMin

  const ticks = []
  let t = Math.ceil(tMin / 3600000) * 3600000
  while (t <= tMax) { ticks.push(t); t += 3600000 }

  return (
    <div className="select-none">
      {/* Timeline bar */}
      <div className="relative h-7 mb-1">
        {levels.map((seg, i) => {
          const s   = fmtGMT(seg.startGMT).getTime()
          const e   = fmtGMT(seg.endGMT).getTime()
          const p   = PHASE[seg.activityLevel] ?? { label: '?', color: '#555' }
          const dur = Math.round((e - s) / 60000)
          const borderRadius = i === 0 ? '2px 0 0 2px' : i === levels.length - 1 ? '0 2px 2px 0' : '0'
          return (
            <div key={i}
              title={`${p.label}: ${fmtHour(new Date(s))} – ${fmtHour(new Date(e))} (${dur}m)`}
              className="absolute h-full"
              style={{
                left:         `${(s - tMin) / span * 100}%`,
                width:        `${(e - s)   / span * 100}%`,
                background:   p.color,
                opacity:      seg.activityLevel === 2 ? 0.45 : 1,
                borderRadius,
              }}
            />
          )
        })}
      </div>

      {/* Hour ticks */}
      <div className="relative h-4 mb-2.5">
        {ticks.map(tick => (
          <div key={tick}
            className="absolute text-[9px] text-ink-3 whitespace-nowrap -translate-x-1/2"
            style={{ left: `${(tick - tMin) / span * 100}%` }}
          >
            {fmtHour(new Date(tick))}
          </div>
        ))}
      </div>

      {/* Phase summary legend */}
      <PhaseSummary levels={levels} />
    </div>
  )
}

function PhaseSummary({ levels }) {
  const totals = {}
  for (const seg of levels) {
    const key = seg.activityLevel
    const ms  = fmtGMT(seg.endGMT).getTime() - fmtGMT(seg.startGMT).getTime()
    totals[key] = (totals[key] ?? 0) + ms
  }

  return (
    <div className="flex gap-3.5 flex-wrap">
      {[3, 0, 1, 2].map(level => {
        const p  = PHASE[level]
        const ms = totals[level] ?? 0
        if (!ms) return null
        const h  = Math.floor(ms / 3600000)
        const m  = Math.round((ms % 3600000) / 60000)
        return (
          <div key={level} className="flex items-center gap-[5px]">
            <div
              className="w-2 h-2 rounded-sm"
              style={{ background: p.color, opacity: level === 2 ? 0.5 : 1 }}
            />
            <span className="text-[10px] text-ink-3">{p.label}</span>
            <span className="text-[11px] font-semibold">
              {h > 0 ? `${h}h ${m}m` : `${m}m`}
            </span>
          </div>
        )
      })}
    </div>
  )
}
