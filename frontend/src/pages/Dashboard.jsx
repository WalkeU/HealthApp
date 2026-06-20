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
  grid:    { strokeDasharray: '3 3', stroke: '#1c1c22', vertical: false },
  xAxis:   { stroke: 'transparent', tick: { fill: '#444460', fontSize: 10, fontFamily: 'inherit' } },
  yAxis:   { stroke: 'transparent', tick: { fill: '#444460', fontSize: 10, fontFamily: 'inherit' }, width: 36 },
  tooltip: { contentStyle: { background: '#111115', border: '1px solid #1c1c22', color: '#dddde8', fontFamily: 'inherit', fontSize: 12 }, cursor: { fill: 'rgba(0,255,135,0.04)' } },
}

const SLEEP_COLORS = { deep: '#6366f1', rem: '#00ff87', light: '#60a5fa', awake: '#f59e0b' }

const SECTION_TITLE = 'text-[10px] font-semibold tracking-[0.1em] uppercase text-ink-3'

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
    <div className="p-7 max-w-[1280px]">
      <TopBar title="Dashboard" />

      {loading ? <Spinner /> : (
        <>
          {/* ── Stat cards ── */}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3 mb-6">
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
          <div className="grid grid-cols-2 gap-3 mb-6">
            <Card>
              <div className={SECTION_TITLE}>Weekly Mileage</div>
              {mileage?.length ? (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={mileage} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid {...CHART.grid} />
                    <XAxis dataKey="week" {...CHART.xAxis} tickFormatter={w => w?.slice(6) || w} />
                    <YAxis {...CHART.yAxis} />
                    <Tooltip {...CHART.tooltip} formatter={v => [`${v} km`, 'Distance']} />
                    <Bar dataKey="total_km" fill="#00ff87" radius={[2, 2, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyState title="No run data yet" />}
            </Card>

            <Card>
              <div className={SECTION_TITLE}>Resting HR</div>
              {hrData?.length ? (
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={hrData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid {...CHART.grid} />
                    <XAxis dataKey="date" {...CHART.xAxis} tickFormatter={d => d?.slice(5)} interval="preserveStartEnd" />
                    <YAxis {...CHART.yAxis} domain={['auto', 'auto']} />
                    <Tooltip {...CHART.tooltip} formatter={v => [`${Math.round(v)} bpm`, 'HR']} />
                    <Line dataKey="avg_resting_hr" stroke="#ff4d6a" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : <EmptyState title="No HR data yet" />}
            </Card>

            <Card>
              <div className={SECTION_TITLE}>HRV (last night)</div>
              {hrvData?.length ? (
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={hrvData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid {...CHART.grid} />
                    <XAxis dataKey="date" {...CHART.xAxis} tickFormatter={d => d?.slice(5)} interval="preserveStartEnd" />
                    <YAxis {...CHART.yAxis} domain={['auto', 'auto']} />
                    <Tooltip {...CHART.tooltip} formatter={v => [`${Math.round(v)} ms`, 'HRV']} />
                    <Line dataKey="avg_hrv" stroke="#00ff87" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : <EmptyState title="No HRV data yet" />}
            </Card>

            <Card>
              <div className={SECTION_TITLE}>Sleep duration</div>
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

          {/* ── Today's sleep ── */}
          {today.date === new Date().toISOString().slice(0, 10) && (
            <SleepCard today={today} onViewAll={() => navigate('/sleep')} />
          )}

          {/* ── Recent runs ── */}
          <Card className="!p-0">
            <div className="px-4 py-3.5 border-b border-border">
              <span className={SECTION_TITLE}>Recent Runs</span>
            </div>
            {s.recentRuns?.length ? (
              <DataTable>
                <thead>
                  <tr>
                    <Th>Date</Th><Th>Name</Th><Th>Distance</Th>
                    <Th>Duration</Th><Th>Pace</Th><Th>Avg HR</Th><Th>Source</Th>
                  </tr>
                </thead>
                <tbody>
                  {s.recentRuns.map(run => <RunRow key={run.id} run={run} />)}
                </tbody>
              </DataTable>
            ) : (
              <EmptyState icon={Activity} title="No runs yet" description="Sync from Garmin to see your runs here." />
            )}
          </Card>
        </>
      )}
    </div>
  )
}

// ─── Sleep card ───────────────────────────────────────────────────────────────

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
    <Card className="mb-4 !p-0">
      <div className="px-5 py-[18px]">
        <div className="flex items-center justify-between mb-3.5">
          <div>
            <div className="text-[10px] font-semibold tracking-[0.1em] uppercase text-ink-3">
              Last night — {today.date || ''}
            </div>
            <div className="flex gap-3 items-center mt-0.5">
              {today.sleep_duration_s && (
                <span className="text-[22px] font-bold tracking-[-0.02em]">{fmtH(today.sleep_duration_s)}</span>
              )}
              {today.sleep_score != null && (
                <span className="text-[11px] text-ink-2">
                  score <span className="font-bold" style={{ color: scoreColor(today.sleep_score) }}>{today.sleep_score}</span>
                </span>
              )}
              {today.spo2_avg != null && (
                <span className="text-[11px] text-ink-2">
                  SpO2 <span className="font-bold">{Math.round(today.spo2_avg)}%</span>
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onViewAll}
            className="flex items-center gap-1 text-[11px] text-ink-2 bg-transparent border border-border rounded px-2.5 py-1 cursor-pointer transition-colors hover:bg-hover"
          >
            Sleep history <ArrowRight size={12} />
          </button>
        </div>

        <SleepTimeline date={today.date} />

        {total > 0 && (
          <div className="mt-3.5">
            <div className="flex h-3 rounded-sm overflow-hidden gap-px mb-2">
              {segments.map(({ key, color }) => {
                const v = today[key] ?? 0
                return v ? <div key={key} style={{ flex: v, background: color }} /> : null
              })}
            </div>
            <div className="flex gap-3.5 flex-wrap">
              {segments.map(({ key, label, color }) => {
                const v = today[key]
                if (!v) return null
                return (
                  <div key={key} className="flex items-center gap-[5px]">
                    <div className="w-[7px] h-[7px] rounded-sm" style={{ background: color }} />
                    <span className="text-[10px] text-ink-3">{label}</span>
                    <span className="text-[11px] font-semibold">{fmtH(v)}</span>
                    <span className="text-[10px] text-ink-3">{Math.round(v / total * 100)}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

// ─── Body Battery card ───────────────────────────────────────────────────────

function BodyBatteryCard({ today, bbData }) {
  const high    = today.body_battery_high
  const low     = today.body_battery_low ?? 0
  const charged = today.body_battery_charged
  const drained = today.body_battery_drained
  const color   = high >= 75 ? '#00ff87' : high >= 40 ? '#ffb340' : '#ff4d6a'

  return (
    <Card className="!px-[18px] !py-4">
      <div className="text-[10px] font-semibold tracking-[0.1em] uppercase text-ink-3">Body Battery</div>

      <div className="flex items-center justify-between my-2 mb-2.5">
        <div className="flex items-baseline gap-[5px]">
          <span className="text-[28px] font-bold tracking-[-0.02em]" style={{ color }}>{high}</span>
          <span className="text-[11px] text-ink-3">/ 100</span>
        </div>
        <div className="text-[11px] text-ink-3 text-right leading-relaxed">
          {charged != null && <div><span className="text-accent">+{charged}</span> charged</div>}
          {drained != null && <div><span className="text-danger">-{drained}</span> drained</div>}
        </div>
      </div>

      {/* Gauge bar */}
      <div className="relative h-2 bg-surface rounded border border-border overflow-hidden mb-1">
        <div
          className="absolute h-full rounded"
          style={{
            left:       `${low}%`,
            width:      `${Math.max(high - low, 2)}%`,
            background: `linear-gradient(90deg, #ffb340, ${color})`,
          }}
        />
      </div>
      <div className="flex justify-between text-[9px] text-ink-3 mb-2.5">
        <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
      </div>

      {bbData?.length > 1 && (
        <ResponsiveContainer width="100%" height={90}>
          <LineChart data={bbData} margin={{ top: 2, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid {...CHART.grid} />
            <XAxis dataKey="date" {...CHART.xAxis} tickFormatter={d => d?.slice(5)} interval="preserveStartEnd" />
            <YAxis {...CHART.yAxis} domain={[0, 100]} />
            <Tooltip {...CHART.tooltip} formatter={(v, name) => [Math.round(v), name === 'high' ? 'Peak' : 'Low']} />
            <Line dataKey="high" stroke={color}     strokeWidth={1.5} dot={false} />
            <Line dataKey="low"  stroke="#444460"   strokeWidth={1}   dot={false} strokeDasharray="3 3" />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Card>
  )
}

function HrvStatus({ status }) {
  const map = {
    BALANCED:   { colorClass: 'text-accent',  label: 'Balanced' },
    UNBALANCED: { colorClass: 'text-warn',    label: 'Unbalanced' },
    LOW:        { colorClass: 'text-danger',  label: 'Low' },
  }
  const m = map[status] || { colorClass: 'text-ink-3', label: status }
  return <span className={`text-[10px] font-bold ${m.colorClass}`}>{m.label}</span>
}

function scoreColor(s) {
  return s >= 80 ? '#00ff87' : s >= 60 ? '#ffb340' : '#ff4d6a'
}

// ─── Table helpers ────────────────────────────────────────────────────────────

function DataTable({ children }) {
  return (
    <table className="w-full border-collapse">
      {children}
    </table>
  )
}

function Th({ children }) {
  return (
    <th className="text-left text-[10px] font-semibold tracking-[0.12em] uppercase text-ink-3 px-4 pb-2.5 border-b border-border">
      {children}
    </th>
  )
}

function RunRow({ run }) {
  return (
    <tr className="border-b border-border last:border-b-0 cursor-pointer transition-colors hover:[&>td]:bg-hover">
      <td className="px-4 py-3 text-[12px] text-ink-2">{formatDate(run.date)}</td>
      <td className="px-4 py-3 max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap text-[13px]">
        {run.name || <span className="text-ink-3">—</span>}
      </td>
      <td className="px-4 py-3 text-[13px] text-accent font-semibold">{formatDistance(run.distance_m)}</td>
      <td className="px-4 py-3 text-[13px]">{formatDuration(run.duration_s)}</td>
      <td className="px-4 py-3 text-[13px]">{formatPace(run.avg_pace_s)}</td>
      <td className="px-4 py-3 text-[13px]">{run.avg_hr ? `${run.avg_hr} bpm` : '—'}</td>
      <td className="px-4 py-3 text-[11px] text-ink-3">{run.source}</td>
    </tr>
  )
}
