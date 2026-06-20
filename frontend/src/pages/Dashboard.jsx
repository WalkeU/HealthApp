import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { Activity, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../components/layout/TopBar.jsx'
import StatCard from '../components/ui/StatCard.jsx'
import Card from '../components/ui/Card.jsx'
import Spinner from '../components/ui/Spinner.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import SleepTimeline from '../components/SleepTimeline.jsx'
import { useDashboard } from '../hooks/useDashboard.js'
import { useWeeklyMileage } from '../hooks/useActivities.js'
import { useHrTrend, useHrvTrend, useSleepTrend, useBbTrend } from '../hooks/useHealth.js'
import { formatPace, formatDistance, formatDate, formatDuration } from '../utils/format.js'

const CHART = {
  grid:    { strokeDasharray: '3 3', stroke: 'var(--border)', vertical: false },
  xAxis:   { stroke: 'transparent', tick: { fill: 'var(--text-3)', fontSize: 10, fontFamily: 'inherit' } },
  yAxis:   { stroke: 'transparent', tick: { fill: 'var(--text-3)', fontSize: 10, fontFamily: 'inherit' }, width: 36 },
  tooltip: { contentStyle: { background: '#111115', border: '1px solid #1c1c22', color: '#dddde8', fontFamily: 'inherit', fontSize: 12 }, cursor: { fill: 'rgba(0,255,135,0.04)' } },
}

const SLEEP_COLORS = { deep: '#6366f1', rem: '#00ff87', light: '#60a5fa', awake: '#f59e0b' }

export default function Dashboard() {
  const navigate = useNavigate()
  const { data: summary, loading } = useDashboard()
  const { data: mileage }          = useWeeklyMileage(12)
  const { data: hrData }           = useHrTrend(30)
  const { data: hrvData }          = useHrvTrend(30)
  const { data: sleepData }        = useSleepTrend(30)
  const { data: bbData }           = useBbTrend(30)

  const s      = summary || {}
  const weekly = s.weeklyKm     || {}
  const health = s.latestHealth || {}
  const today  = s.todayHealth  || {}

  return (
    <div className="page">
      <TopBar title="Dashboard" />

      {loading ? <Spinner /> : (
        <>
          {/* ── Stat cards ── */}
          <div className="stat-grid" style={{ marginBottom: 24 }}>
            <StatCard
              label="Weekly km"
              value={weekly.total_km ?? '0'}
              unit="km"
              sub={`${weekly.runs ?? 0} runs`}
            />
            <StatCard
              label="Avg Pace"
              value={s.avgPace?.avg_pace_s ? formatPace(s.avgPace.avg_pace_s).split(' ')[0] : '—'}
              unit="/km"
              sub="30-day avg"
            />
            <StatCard label="Resting HR" value={health.resting_hr ? Math.round(health.resting_hr) : '—'} unit="bpm" sub="7-day avg" />
            <StatCard
              label="HRV"
              value={health.hrv ? Math.round(health.hrv) : '—'}
              unit="ms"
              sub={today.hrv_status ? <HrvStatus status={today.hrv_status} /> : '7-day avg'}
            />
            <StatCard
              label="Sleep"
              value={health.sleep_duration_s ? `${Math.floor(health.sleep_duration_s / 3600)}h${Math.round((health.sleep_duration_s % 3600) / 60)}m` : '—'}
              sub={health.sleep_score ? `score ${Math.round(health.sleep_score)}` : '7-day avg'}
            />
            {health.spo2_avg != null && (
              <StatCard label="SpO2" value={Math.round(health.spo2_avg)} unit="%" sub="7-day avg" />
            )}
          </div>

          {/* ── Charts ── */}
          <div className="chart-grid">
            <Card>
              <div style={styles.chartTitle}>Weekly Mileage</div>
              {mileage?.length ? (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={mileage} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid {...CHART.grid} />
                    <XAxis dataKey="week" {...CHART.xAxis} tickFormatter={w => w?.slice(6) || w} />
                    <YAxis {...CHART.yAxis} />
                    <Tooltip {...CHART.tooltip} formatter={v => [`${v} km`, 'Distance']} />
                    <Bar dataKey="total_km" fill="var(--accent)" radius={[2, 2, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyState title="No run data yet" />}
            </Card>

            <Card>
              <div style={styles.chartTitle}>Resting HR</div>
              {hrData?.length ? (
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={hrData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid {...CHART.grid} />
                    <XAxis dataKey="date" {...CHART.xAxis} tickFormatter={d => d?.slice(5)} interval="preserveStartEnd" />
                    <YAxis {...CHART.yAxis} domain={['auto', 'auto']} />
                    <Tooltip {...CHART.tooltip} formatter={v => [`${Math.round(v)} bpm`, 'HR']} />
                    <Line dataKey="avg_resting_hr" stroke="var(--danger)" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : <EmptyState title="No HR data yet" />}
            </Card>

            <Card>
              <div style={styles.chartTitle}>HRV (last night)</div>
              {hrvData?.length ? (
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={hrvData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid {...CHART.grid} />
                    <XAxis dataKey="date" {...CHART.xAxis} tickFormatter={d => d?.slice(5)} interval="preserveStartEnd" />
                    <YAxis {...CHART.yAxis} domain={['auto', 'auto']} />
                    <Tooltip {...CHART.tooltip} formatter={v => [`${Math.round(v)} ms`, 'HRV']} />
                    <Line dataKey="avg_hrv" stroke="var(--accent)" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : <EmptyState title="No HRV data yet" />}
            </Card>

            <Card>
              <div style={styles.chartTitle}>Sleep duration</div>
              {sleepData?.length ? (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={sleepData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid {...CHART.grid} />
                    <XAxis dataKey="date" {...CHART.xAxis} tickFormatter={d => d?.slice(5)} interval="preserveStartEnd" />
                    <YAxis {...CHART.yAxis} tickFormatter={s => `${Math.round(s / 3600)}h`} />
                    <Tooltip {...CHART.tooltip} formatter={v => [formatDuration(v), 'Sleep']} />
                    <Bar dataKey="avg_sleep_duration_s" fill={SLEEP_COLORS.rem} radius={[2, 2, 0, 0]} maxBarSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyState title="No sleep data yet" />}
            </Card>

            {today.body_battery_high != null && (
              <BodyBatteryCard today={today} bbData={bbData} />
            )}
          </div>

          {/* ── Today's sleep (only if date matches today) ── */}
          {today.date === new Date().toISOString().slice(0, 10) && (
            <SleepCard today={today} onViewAll={() => navigate('/sleep')} />
          )}

          {/* ── Recent runs ── */}
          <Card padding="0">
            <div style={styles.tableHeader}>
              <span style={styles.tableTitle}>Recent Runs</span>
            </div>
            {s.recentRuns?.length ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th><th>Name</th><th>Distance</th>
                    <th>Duration</th><th>Pace</th><th>Avg HR</th><th>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {s.recentRuns.map(run => <RunRow key={run.id} run={run} />)}
                </tbody>
              </table>
            ) : (
              <EmptyState icon={Activity} title="No runs yet" description="Sync from Garmin to see your runs here." />
            )}
          </Card>
        </>
      )}
    </div>
  )
}

// ─── Sleep card (single — no duplicate) ──────────────────────────────────────

function SleepCard({ today, onViewAll }) {
  const hasAny = today.sleep_duration_s || today.deep_sleep_s || today.rem_sleep_s
  if (!hasAny) return null

  const fmtH = (s) => {
    if (!s) return null
    const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60)
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  const segments = [
    { key: 'deep_sleep_s',  label: 'Deep',  color: SLEEP_COLORS.deep },
    { key: 'rem_sleep_s',   label: 'REM',   color: SLEEP_COLORS.rem },
    { key: 'light_sleep_s', label: 'Light', color: SLEEP_COLORS.light },
    { key: 'awake_s',       label: 'Awake', color: SLEEP_COLORS.awake },
  ]
  const total = segments.reduce((sum, s) => sum + (today[s.key] ?? 0), 0)

  return (
    <Card style={{ marginBottom: 16 }} padding="18px 20px">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div style={styles.chartTitle} >Last night — {today.date || ''}</div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 2 }}>
            {today.sleep_duration_s && <span style={styles.bigStat}>{fmtH(today.sleep_duration_s)}</span>}
            {today.sleep_score != null && (
              <span style={{ fontSize: 11, color: 'var(--text-2)' }}>
                score <span style={{ fontWeight: 700, color: scoreColor(today.sleep_score) }}>{today.sleep_score}</span>
              </span>
            )}
            {today.spo2_avg != null && (
              <span style={{ fontSize: 11, color: 'var(--text-2)' }}>
                SpO2 <span style={{ fontWeight: 700 }}>{Math.round(today.spo2_avg)}%</span>
              </span>
            )}
          </div>
        </div>
        <button onClick={onViewAll} style={styles.viewAll}>
          Sleep history <ArrowRight size={12} />
        </button>
      </div>

      {/* Phase timeline */}
      <SleepTimeline date={today.date} />

      {/* Breakdown bar */}
      {total > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', height: 12, borderRadius: 2, overflow: 'hidden', gap: 1, marginBottom: 8 }}>
            {segments.map(({ key, color }) => {
              const v = today[key] ?? 0
              return v ? <div key={key} style={{ flex: v, background: color }} /> : null
            })}
          </div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            {segments.map(({ key, label, color }) => {
              const v = today[key]
              if (!v) return null
              return (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 7, height: 7, borderRadius: 1, background: color }} />
                  <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{label}</span>
                  <span style={{ fontSize: 11, fontWeight: 600 }}>{fmtH(v)}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{Math.round(v / total * 100)}%</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </Card>
  )
}

// ─── Body Battery card ───────────────────────────────────────────────────────

function BodyBatteryCard({ today, bbData }) {
  const high    = today.body_battery_high
  const low     = today.body_battery_low ?? 0
  const charged = today.body_battery_charged
  const drained = today.body_battery_drained
  const color   = high >= 75 ? 'var(--accent)' : high >= 40 ? 'var(--warning)' : 'var(--danger)'

  return (
    <Card padding="16px 18px">
      <div style={styles.chartTitle}>Body Battery</div>

      {/* Top row: value + charged/drained */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '8px 0 10px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
          <span style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', color }}>{high}</span>
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>/ 100</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'right', lineHeight: 1.6 }}>
          {charged != null && <div><span style={{ color: 'var(--accent)' }}>+{charged}</span> charged</div>}
          {drained != null && <div><span style={{ color: 'var(--danger)' }}>-{drained}</span> drained</div>}
        </div>
      </div>

      {/* Gauge bar */}
      <div style={{ position: 'relative', height: 8, background: 'var(--bg)', borderRadius: 4, overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 4 }}>
        <div style={{
          position: 'absolute', left: `${low}%`, width: `${Math.max(high - low, 2)}%`,
          height: '100%', background: `linear-gradient(90deg, var(--warning), ${color})`, borderRadius: 4,
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text-3)', marginBottom: 10 }}>
        <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
      </div>

      {/* Trend */}
      {bbData?.length > 1 && (
        <ResponsiveContainer width="100%" height={90}>
          <LineChart data={bbData} margin={{ top: 2, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid {...CHART.grid} />
            <XAxis dataKey="date" {...CHART.xAxis} tickFormatter={d => d?.slice(5)} interval="preserveStartEnd" />
            <YAxis {...CHART.yAxis} domain={[0, 100]} />
            <Tooltip {...CHART.tooltip} formatter={(v, name) => [Math.round(v), name === 'high' ? 'Peak' : 'Low']} />
            <Line dataKey="high" stroke={color}           strokeWidth={1.5} dot={false} />
            <Line dataKey="low"  stroke="var(--text-3)"   strokeWidth={1}   dot={false} strokeDasharray="3 3" />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Card>
  )
}

function HrvStatus({ status }) {
  const map = { BALANCED: { color: 'var(--accent)', label: 'Balanced' }, UNBALANCED: { color: 'var(--warning)', label: 'Unbalanced' }, LOW: { color: 'var(--danger)', label: 'Low' } }
  const m = map[status] || { color: 'var(--text-3)', label: status }
  return <span style={{ color: m.color, fontSize: 10, fontWeight: 700 }}>{m.label}</span>
}

function scoreColor(s) {
  return s >= 80 ? 'var(--accent)' : s >= 60 ? 'var(--warning)' : 'var(--danger)'
}

function RunRow({ run }) {
  return (
    <tr>
      <td style={{ color: 'var(--text-2)', fontSize: 12 }}>{formatDate(run.date)}</td>
      <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {run.name || <span style={{ color: 'var(--text-3)' }}>—</span>}
      </td>
      <td style={{ color: 'var(--accent)', fontWeight: 600 }}>{formatDistance(run.distance_m)}</td>
      <td>{formatDuration(run.duration_s)}</td>
      <td>{formatPace(run.avg_pace_s)}</td>
      <td>{run.avg_hr ? `${run.avg_hr} bpm` : '—'}</td>
      <td style={{ color: 'var(--text-3)', fontSize: 11 }}>{run.source}</td>
    </tr>
  )
}

const styles = {
  chartTitle:  { fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)' },
  bigStat:     { fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' },
  tableHeader: { padding: '14px 16px', borderBottom: '1px solid var(--border)' },
  tableTitle:  { fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)' },
  viewAll: {
    display: 'flex', alignItems: 'center', gap: 4,
    fontSize: 11, color: 'var(--text-2)', background: 'none', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: '4px 10px', cursor: 'pointer',
  },
}
