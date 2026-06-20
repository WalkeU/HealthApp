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
  if (!s) return '—'
  const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

const scoreColor = (s) => s >= 80 ? 'var(--accent)' : s >= 60 ? 'var(--warning)' : 'var(--danger)'

export default function SleepHistory() {
  const { data: allHealth, loading } = useSleepHistory()
  const [selectedDate, setSelectedDate] = useState(null)

  // Only records that have sleep data
  const records = (allHealth || []).filter(r => r.sleep_duration_s != null)

  const selected = records.find(r => r.date === selectedDate) || records[0] || null

  return (
    <div className="page">
      <TopBar title="Sleep History" />

      {loading ? <Spinner /> : !records.length ? (
        <EmptyState icon={Moon} title="No sleep data" description="Sync Garmin to populate sleep history." />
      ) : (
        <div className="split-layout">
          {/* ── Left: date list ── */}
          <div className="split-list">
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
          <div className="split-panel">
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
    <div className={`list-item${active ? ' active' : ''}`} onClick={onClick}>
      <div style={styles.itemDate}>{formatDate(r.date)}</div>
      <div style={styles.itemRow}>
        <span style={styles.itemDuration}>{fmtH(r.sleep_duration_s)}</span>
        {r.sleep_score != null && (
          <span style={{ ...styles.itemScore, color: scoreColor(r.sleep_score) }}>{r.sleep_score}</span>
        )}
      </div>
      {total > 0 && (
        <div style={{ display: 'flex', height: 4, borderRadius: 1, overflow: 'hidden', gap: 0.5, marginTop: 6 }}>
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
      <div style={{ marginBottom: 20 }}>
        <div style={styles.detailDate}>{formatDate(r.date)}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 4 }}>
          <span style={styles.detailTotal}>{fmtH(r.sleep_duration_s)}</span>
          {r.sleep_score != null && (
            <span style={{ fontSize: 12, color: 'var(--text-2)' }}>
              score <span style={{ fontWeight: 700, color: scoreColor(r.sleep_score) }}>{r.sleep_score}</span>
            </span>
          )}
          {r.spo2_avg != null && (
            <span style={{ fontSize: 12, color: 'var(--text-2)' }}>
              SpO2 <span style={{ fontWeight: 700 }}>{Math.round(r.spo2_avg)}%</span>
              {r.spo2_min != null && <span style={{ color: 'var(--text-3)' }}> (min {r.spo2_min}%)</span>}
            </span>
          )}
        </div>
      </div>

      {/* Phase timeline */}
      <div style={styles.section}>
        <div style={styles.sectionLabel}>Phase Timeline</div>
        <SleepTimeline date={r.date} />
      </div>

      {/* Breakdown */}
      {total > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionLabel}>Breakdown</div>
          <div style={{ display: 'flex', height: 16, borderRadius: 2, overflow: 'hidden', gap: 1, marginBottom: 10 }}>
            {SEGMENTS.map(({ key, color }) => {
              const v = r[key] ?? 0
              return v ? <div key={key} style={{ flex: v, background: color }} /> : null
            })}
          </div>
          <div style={styles.breakdownGrid}>
            {SEGMENTS.map(({ key, label, color }) => {
              const v = r[key]
              if (!v) return null
              return (
                <div key={key} style={styles.breakdownItem}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 1, background: color }} />
                    <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)' }}>{label}</span>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{fmtH(v)}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{Math.round(v / total * 100)}%</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Sleep feedback from Garmin */}
      {r.sleep_feedback && (
        <div style={{ ...styles.section, paddingTop: 12 }}>
          <div style={{
            fontSize: 11, color: 'var(--accent)', fontWeight: 600,
            letterSpacing: '0.04em', background: 'var(--accent-10)',
            border: '1px solid var(--accent-20)', borderRadius: 'var(--radius)',
            padding: '6px 12px', display: 'inline-block',
          }}>
            {r.sleep_feedback.replace(/_/g, ' ')}
          </div>
          {r.sleep_need_min && (
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>
              Sleep need: <span style={{ color: 'var(--text-2)', fontWeight: 600 }}>
                {Math.floor(r.sleep_need_min / 60)}h {r.sleep_need_min % 60}m
              </span>
            </div>
          )}
        </div>
      )}

      {/* HRV */}
      {(r.hrv != null || r.hrv_weekly_avg != null) && (
        <div style={styles.section}>
          <div style={styles.sectionLabel}>HRV</div>
          <div style={styles.statRow}>
            <StatPill label="Last night"  value={r.hrv            ? `${Math.round(r.hrv)} ms`            : '—'} />
            <StatPill label="Weekly avg"  value={r.hrv_weekly_avg ? `${Math.round(r.hrv_weekly_avg)} ms` : '—'} />
            {r.hrv_status && <StatPill label="Status" value={r.hrv_status} accent={r.hrv_status === 'BALANCED'} />}
          </div>
        </div>
      )}

      {/* Respiration */}
      {r.avg_respiration != null && (
        <div style={styles.section}>
          <div style={styles.sectionLabel}>Respiration (breaths/min)</div>
          <div style={styles.statRow}>
            <StatPill label="Avg"  value={r.avg_respiration.toFixed(1)} />
            <StatPill label="Min"  value={r.min_respiration} />
            <StatPill label="Max"  value={r.max_respiration} />
          </div>
        </div>
      )}

      {/* Sleep quality detail */}
      <div style={styles.section}>
        <div style={styles.sectionLabel}>Sleep quality</div>
        <div style={styles.statRow}>
          {r.avg_sleep_hr  != null && <StatPill label="Avg HR"         value={`${r.avg_sleep_hr} bpm`} />}
          {r.awake_count   != null && <StatPill label="Awakenings"     value={r.awake_count} />}
          {r.avg_stress    != null && <StatPill label="Sleep stress"   value={Math.round(r.avg_stress)} />}
          {r.spo2_avg      != null && <StatPill label="SpO2 avg"       value={`${Math.round(r.spo2_avg)}%`} />}
          {r.spo2_min      != null && <StatPill label="SpO2 min"       value={`${r.spo2_min}%`} />}
          {r.sleep_rem_pct != null && <StatPill label="REM %"          value={`${r.sleep_rem_pct}%`} />}
          {r.sleep_deep_pct!= null && <StatPill label="Deep %"         value={`${r.sleep_deep_pct}%`} />}
        </div>
      </div>

      {/* Daily metrics */}
      <div style={styles.section}>
        <div style={styles.sectionLabel}>Day</div>
        <div style={styles.statRow}>
          {r.resting_hr         && <StatPill label="Resting HR"    value={`${r.resting_hr} bpm`} />}
          {r.body_battery_high  != null && <StatPill label="Body Battery"   value={`${r.body_battery_low ?? '?'}→${r.body_battery_high}`} />}
          {r.body_battery_charged != null && <StatPill label="BB charged"   value={`+${r.body_battery_charged}`} accent />}
          {r.body_battery_drained != null && <StatPill label="BB drained"   value={`-${r.body_battery_drained}`} />}
          {r.steps              && <StatPill label="Steps"         value={r.steps.toLocaleString()} />}
          {r.weight_kg          && <StatPill label="Weight"        value={`${r.weight_kg.toFixed(1)} kg`} />}
        </div>
      </div>
    </>
  )
}

function StatPill({ label, value, accent }) {
  return (
    <div style={styles.pill}>
      <div style={styles.pillLabel}>{label}</div>
      <div style={{ ...styles.pillValue, ...(accent ? { color: 'var(--accent)' } : {}) }}>{value}</div>
    </div>
  )
}

function formatDate(str) {
  if (!str) return '—'
  const d = new Date(str + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

const styles = {
  itemDate:     { fontSize: 10, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 },
  itemRow:      { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  itemDuration: { fontSize: 14, fontWeight: 700 },
  itemScore:    { fontSize: 12, fontWeight: 700 },
  detailDate:   { fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em' },
  detailTotal:  { fontSize: 36, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1 },
  section:      { paddingTop: 16, borderTop: '1px solid var(--border)' },
  sectionLabel: { fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 12 },
  breakdownGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 8 },
  breakdownItem: { background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 12px' },
  statRow:      { display: 'flex', gap: 8, flexWrap: 'wrap' },
  pill:         { background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 12px', minWidth: 80 },
  pillLabel:    { fontSize: 9, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 3 },
  pillValue:    { fontSize: 14, fontWeight: 600 },
}
