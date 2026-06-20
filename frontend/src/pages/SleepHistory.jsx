import { useState } from 'react'
import { Moon } from 'lucide-react'
import TopBar from '../components/layout/TopBar.jsx'
import Spinner from '../components/ui/Spinner.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import SleepTimeline from '../components/SleepTimeline.jsx'
import { useFetch } from '../hooks/useFetch.js'
import { api } from '../api/client.js'

const SLEEP_COLORS = { deep: '#6366f1', rem: '#00ff87', light: '#60a5fa', awake: '#f59e0b' }

const SEGMENTS = [
  { key: 'deep_sleep_s',  label: 'Deep',  color: SLEEP_COLORS.deep  },
  { key: 'rem_sleep_s',   label: 'REM',   color: SLEEP_COLORS.rem   },
  { key: 'light_sleep_s', label: 'Light', color: SLEEP_COLORS.light },
  { key: 'awake_s',       label: 'Awake', color: SLEEP_COLORS.awake },
]

function useSleepHistory() {
  return useFetch(() => api.getHealthDaily({ limit: 90 }), [])
}

const fmtH = (s) => {
  if (!s) return '"”'
  const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

const scoreColor = (s) => s >= 80 ? '#00ff87' : s >= 60 ? '#ffb340' : '#ff4d6a'

const SECTION_LABEL = 'text-[10px] font-bold tracking-[0.12em] uppercase text-ink-3 mb-3'

export default function SleepHistory() {
  const { data: allHealth, loading } = useSleepHistory()
  const [selectedDate, setSelectedDate] = useState(null)

  const records = (allHealth || []).filter(r => r.sleep_duration_s != null)
  const selected = records.find(r => r.date === selectedDate) || records[0] || null

  return (
    <div className="p-7 max-w-[1280px]">
      <TopBar title="Sleep History" />

      {loading ? <Spinner /> : !records.length ? (
        <EmptyState icon={Moon} title="No sleep data" description="Sync Garmin to populate sleep history." />
      ) : (
        <div className="grid grid-cols-[280px,1fr] gap-4 h-[calc(100vh-112px)]">
          {/* ── Left: date list ── */}
          <div className="border border-border rounded bg-card flex flex-col overflow-y-auto">
            {records.map(r => (
              <SleepListItem
                key={r.date}
                record={r}
                active={r.date === (selectedDate || records[0]?.date)}
                onClick={() => setSelectedDate(r.date)}
              />
            ))}
          </div>

          {/* ── Right: detail ── */}
          <div className="border border-border rounded bg-card p-6 overflow-y-auto flex flex-col gap-4">
            {selected
              ? <SleepDetail record={selected} />
              : <EmptyState icon={Moon} title="Select a night" />}
          </div>
        </div>
      )}
    </div>
  )
}

function SleepListItem({ record: r, active, onClick }) {
  const total = SEGMENTS.reduce((s, seg) => s + (r[seg.key] ?? 0), 0)
  return (
    <div
      onClick={onClick}
      className={[
        'px-4 py-3.5 border-b border-border last:border-b-0 cursor-pointer transition-colors',
        active
          ? 'bg-accent/8 border-l-2 border-l-accent'
          : 'hover:bg-hover',
      ].join(' ')}
    >
      <div className="text-[10px] font-semibold tracking-[0.08em] uppercase text-ink-3 mb-[3px]">
        {formatDate(r.date)}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold">{fmtH(r.sleep_duration_s)}</span>
        {r.sleep_score != null && (
          <span className="text-xs font-bold" style={{ color: scoreColor(r.sleep_score) }}>{r.sleep_score}</span>
        )}
      </div>
      {total > 0 && (
        <div className="flex h-1 rounded-sm overflow-hidden mt-1.5" style={{ gap: 0.5 }}>
          {SEGMENTS.map(({ key, color }) => {
            const v = r[key] ?? 0
            return v ? <div key={key} style={{ flex: v, background: color }} /> : null
          })}
        </div>
      )}
    </div>
  )
}

function SleepDetail({ record: r }) {
  const total = SEGMENTS.reduce((s, seg) => s + (r[seg.key] ?? 0), 0)

  return (
    <>
      {/* Header */}
      <div className="mb-5">
        <div className="text-[11px] text-ink-3 uppercase tracking-[0.1em]">{formatDate(r.date)}</div>
        <div className="flex items-baseline gap-3 mt-1">
          <span className="text-[36px] font-extrabold tracking-[-0.03em] leading-none">{fmtH(r.sleep_duration_s)}</span>
          {r.sleep_score != null && (
            <span className="text-xs text-ink-2">
              score <span className="font-bold" style={{ color: scoreColor(r.sleep_score) }}>{r.sleep_score}</span>
            </span>
          )}
          {r.spo2_avg != null && (
            <span className="text-xs text-ink-2">
              SpO2 <span className="font-bold">{Math.round(r.spo2_avg)}%</span>
              {r.spo2_min != null && <span className="text-ink-3"> (min {r.spo2_min}%)</span>}
            </span>
          )}
        </div>
      </div>

      {/* Phase timeline */}
      <div className="pt-4 border-t border-border">
        <div className={SECTION_LABEL}>Phase Timeline</div>
        <SleepTimeline date={r.date} />
      </div>

      {/* Breakdown */}
      {total > 0 && (
        <div className="pt-4 border-t border-border">
          <div className={SECTION_LABEL}>Breakdown</div>
          <div className="flex h-4 rounded-sm overflow-hidden gap-px mb-2.5">
            {SEGMENTS.map(({ key, color }) => {
              const v = r[key] ?? 0
              return v ? <div key={key} style={{ flex: v, background: color }} /> : null
            })}
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-2">
            {SEGMENTS.map(({ key, label, color }) => {
              const v = r[key]
              if (!v) return null
              return (
                <div key={key} className="bg-surface border border-border rounded px-3 py-2.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-2 h-2 rounded-sm" style={{ background: color }} />
                    <span className="text-[10px] font-semibold tracking-[0.08em] uppercase text-ink-3">{label}</span>
                  </div>
                  <div className="text-[18px] font-bold">{fmtH(v)}</div>
                  <div className="text-[11px] text-ink-3">{Math.round(v / total * 100)}%</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Sleep feedback from Garmin */}
      {(r.sleep_feedback || r.nap_duration_s) && (
        <div className="pt-3 border-t border-border">
          <div className="flex flex-wrap gap-2 items-center">
            {r.sleep_feedback && (
              <div className={[
                'text-[11px] font-semibold tracking-[0.04em] rounded px-2.5 py-[5px] border',
                r.sleep_feedback.startsWith('POSITIVE')
                  ? 'bg-accent/8 text-accent border-accent/18'
                  : 'bg-danger/8 text-danger border-danger/20',
              ].join(' ')}>
                {r.sleep_feedback.replace(/_/g, ' ')}
              </div>
            )}
            {r.nap_duration_s > 0 && (
              <div className="text-[11px] font-semibold tracking-[0.04em] rounded px-2.5 py-[5px] border bg-warn/10 text-warn border-warn/20">
                + nap {fmtH(r.nap_duration_s)}
              </div>
            )}
          </div>
          {r.sleep_need_min && (
            <div className="text-[11px] text-ink-3 mt-2">
              Sleep need: <span className="text-ink-2 font-semibold">
                {Math.floor(r.sleep_need_min / 60)}h {r.sleep_need_min % 60}m
              </span>
            </div>
          )}
        </div>
      )}

      {/* HRV */}
      {(r.hrv != null || r.hrv_weekly_avg != null) && (
        <div className="pt-4 border-t border-border">
          <div className={SECTION_LABEL}>HRV</div>
          <div className="flex gap-2 flex-wrap">
            <StatPill label="Last night"  value={r.hrv            ? `${Math.round(r.hrv)} ms`            : '"”'} />
            <StatPill label="Weekly avg"  value={r.hrv_weekly_avg ? `${Math.round(r.hrv_weekly_avg)} ms` : '"”'} />
            {r.hrv_status && <StatPill label="Status" value={r.hrv_status} accent={r.hrv_status === 'BALANCED'} />}
          </div>
        </div>
      )}

      {/* Respiration */}
      {r.avg_respiration != null && (
        <div className="pt-4 border-t border-border">
          <div className={SECTION_LABEL}>Respiration (breaths/min)</div>
          <div className="flex gap-2 flex-wrap">
            <StatPill label="Avg" value={r.avg_respiration.toFixed(1)} />
            <StatPill label="Min" value={r.min_respiration} />
            <StatPill label="Max" value={r.max_respiration} />
          </div>
        </div>
      )}

      {/* Sleep quality detail */}
      <div className="pt-4 border-t border-border">
        <div className={SECTION_LABEL}>Sleep quality</div>
        <div className="flex gap-2 flex-wrap">
          {r.avg_sleep_hr   != null && <StatPill label="Avg HR"       value={`${r.avg_sleep_hr} bpm`} />}
          {r.awake_count    != null && <StatPill label="Awakenings"   value={r.awake_count} />}
          {r.avg_stress     != null && <StatPill label="Sleep stress" value={Math.round(r.avg_stress)} />}
          {r.spo2_avg       != null && <StatPill label="SpO2 avg"     value={`${Math.round(r.spo2_avg)}%`} />}
          {r.spo2_min       != null && <StatPill label="SpO2 min"     value={`${r.spo2_min}%`} />}
          {r.sleep_rem_pct  != null && <StatPill label="REM %"        value={`${r.sleep_rem_pct}%`} />}
          {r.sleep_deep_pct != null && <StatPill label="Deep %"       value={`${r.sleep_deep_pct}%`} />}
        </div>
      </div>

      {/* Daily metrics */}
      <div className="pt-4 border-t border-border">
        <div className={SECTION_LABEL}>Day</div>
        <div className="flex gap-2 flex-wrap">
          {r.resting_hr              && <StatPill label="Resting HR"   value={`${r.resting_hr} bpm`} />}
          {r.body_battery_high != null && <StatPill label="Body Battery" value={`${r.body_battery_low ?? '?'}→${r.body_battery_high}`} />}
          {r.body_battery_charged != null && <StatPill label="BB charged" value={`+${r.body_battery_charged}`} accent />}
          {r.body_battery_drained != null && <StatPill label="BB drained" value={`-${r.body_battery_drained}`} />}
          {r.steps                   && <StatPill label="Steps"        value={r.steps.toLocaleString()} />}
          {r.weight_kg               && <StatPill label="Weight"       value={`${r.weight_kg.toFixed(1)} kg`} />}
        </div>
      </div>
    </>
  )
}

function StatPill({ label, value, accent }) {
  return (
    <div className="bg-surface border border-border rounded px-3 py-2 min-w-[80px]">
      <div className="text-[9px] font-semibold tracking-[0.1em] uppercase text-ink-3 mb-[3px]">{label}</div>
      <div className={`text-sm font-semibold ${accent ? 'text-accent' : 'text-ink'}`}>{value}</div>
    </div>
  )
}

function formatDate(str) {
  if (!str) return '"”'
  const d = new Date(str + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

