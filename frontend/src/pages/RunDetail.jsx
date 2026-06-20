import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Activity } from 'lucide-react'
import TopBar from '../components/layout/TopBar.jsx'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import Spinner from '../components/ui/Spinner.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import { useFetch } from '../hooks/useFetch.js'
import { api } from '../api/client.js'
import { formatDate, formatDistance, formatDuration, formatPace } from '../utils/format.js'

function useActivity(id) {
  return useFetch(() => api.getActivity(id), [id])
}

const fmtTime  = (s)  => s  != null ? formatDuration(s)               : null
const fmtMs    = (ms) => ms != null ? `${Math.round(ms)} ms`          : null
const fmtCm    = (cm) => cm != null ? `${cm.toFixed(1)} cm`           : null
const fmtWatt  = (w)  => w  != null ? `${Math.round(w)} W`           : null
const fmtCad   = (c)  => c  != null ? `${c} spm`                     : null
const fmtSpeed = (ms) => ms != null ? `${(ms * 3.6).toFixed(1)} km/h`: null

const SECTION_TITLE = 'text-[10px] font-bold tracking-[0.12em] uppercase text-ink-3 mb-2.5'

export default function RunDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: run, loading, error } = useActivity(id)

  return (
    <div className="px-4 py-5 md:p-7 max-w-[1280px]">
      <TopBar title="Run Detail">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft size={13} /> Back
        </Button>
      </TopBar>

      {loading ? <Spinner /> : error ? (
        <EmptyState title="Error" description={error} />
      ) : !run ? (
        <EmptyState icon={Activity} title="Run not found" />
      ) : (
        <>
          {/* Hero */}
          <div className="mb-6 pb-5 border-b border-border">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] text-ink-3 tracking-[0.08em] uppercase mb-1">{formatDate(run.date)}</div>
                <div className="text-[18px] font-bold tracking-[-0.02em] mb-1">{run.name || 'Run'}</div>
                {run.location_name && <div className="text-xs text-ink-2 mb-2.5">{run.location_name}</div>}
              </div>
              <div className="flex gap-1.5 flex-wrap justify-end">
                {run.is_pr ? <Badge color="accent">PR</Badge> : null}
                {run.training_effect_label && <Badge>{run.training_effect_label}</Badge>}
                <Badge>{run.source}</Badge>
              </div>
            </div>
            <div className="text-[52px] font-extrabold text-accent tracking-[-0.04em] leading-none mt-3">
              {formatDistance(run.distance_m)}
            </div>
          </div>

          <StatSection title="Primary">
            <Stat label="Duration"       value={fmtTime(run.duration_s)} />
            <Stat label="Moving Time"    value={fmtTime(run.moving_duration_s)} />
            <Stat label="Elapsed Time"   value={fmtTime(run.elapsed_duration_s)} />
            <Stat label="Avg Pace"       value={formatPace(run.avg_pace_s)} accent />
            <Stat label="Avg Speed"      value={fmtSpeed(run.avg_speed_ms)} />
            <Stat label="Max Speed"      value={fmtSpeed(run.max_speed_ms)} />
            <Stat label="Calories"       value={run.calories ? `${run.calories} kcal` : null} />
            <Stat label="Steps"          value={run.steps?.toLocaleString()} />
          </StatSection>

          <StatSection title="Heart Rate">
            <Stat label="Avg HR"   value={run.avg_hr ? `${run.avg_hr} bpm` : null} />
            <Stat label="Max HR"   value={run.max_hr ? `${run.max_hr} bpm` : null} />
            <Stat label="Zone 1"   value={fmtTime(run.hr_zone1_s)} sub="<60%" />
            <Stat label="Zone 2"   value={fmtTime(run.hr_zone2_s)} sub="60â€“70%" />
            <Stat label="Zone 3"   value={fmtTime(run.hr_zone3_s)} sub="70â€“80%" />
            <Stat label="Zone 4"   value={fmtTime(run.hr_zone4_s)} sub="80â€“90%" />
            <Stat label="Zone 5"   value={fmtTime(run.hr_zone5_s)} sub=">90%" />
          </StatSection>

          {(run.hr_zone1_s || run.hr_zone2_s || run.hr_zone3_s || run.hr_zone4_s || run.hr_zone5_s) && (
            <HrZoneBar run={run} />
          )}

          <StatSection title="Elevation">
            <Stat label="Gain" value={run.elevation_m      != null ? `${Math.round(run.elevation_m)} m`      : null} />
            <Stat label="Loss" value={run.elevation_loss_m != null ? `${Math.round(run.elevation_loss_m)} m` : null} />
          </StatSection>

          {(run.avg_cadence || run.avg_stride_length_m || run.avg_vertical_oscillation) && (
            <StatSection title="Running Dynamics">
              <Stat label="Avg Cadence"   value={fmtCad(run.avg_cadence)} />
              <Stat label="Max Cadence"   value={fmtCad(run.max_cadence)} />
              <Stat label="Stride Length" value={run.avg_stride_length_m ? `${run.avg_stride_length_m.toFixed(2)} m` : null} />
              <Stat label="Vert. Osc."    value={fmtCm(run.avg_vertical_oscillation)} />
              <Stat label="GCT"           value={fmtMs(run.avg_ground_contact_time)} />
              <Stat label="Vert. Ratio"   value={run.avg_vertical_ratio ? `${run.avg_vertical_ratio.toFixed(1)}%` : null} />
            </StatSection>
          )}

          {(run.avg_power || run.norm_power) && (
            <StatSection title="Power">
              <Stat label="Avg Power" value={fmtWatt(run.avg_power)} />
              <Stat label="Max Power" value={fmtWatt(run.max_power)} />
              <Stat label="NP"        value={fmtWatt(run.norm_power)} />
            </StatSection>
          )}

          {(run.aerobic_te || run.vo2max) && (
            <StatSection title="Training Load">
              <Stat label="Aerobic TE"   value={run.aerobic_te   ? run.aerobic_te.toFixed(1)   : null} />
              <Stat label="Anaerobic TE" value={run.anaerobic_te ? run.anaerobic_te.toFixed(1) : null} />
              <Stat label="VO2 Max"      value={run.vo2max       ? run.vo2max.toFixed(1)        : null} />
            </StatSection>
          )}
        </>
      )}
    </div>
  )
}

function StatSection({ title, children }) {
  const items = Array.isArray(children) ? children.flat() : [children]
  const visible = items.filter(c => c?.props?.value != null)
  if (!visible.length) return null

  return (
    <div className="mb-5">
      <div className={SECTION_TITLE}>{title}</div>
      <div className="grid grid-cols-2 md:grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2">
        {visible}
      </div>
    </div>
  )
}

function Stat({ label, value, sub, accent }) {
  if (value == null) return null
  return (
    <div className="bg-card border border-border rounded px-3.5 py-3">
      <div className="text-[10px] font-semibold tracking-[0.08em] uppercase text-ink-3 mb-1">
        {label}{sub && <span className="text-[9px] font-normal"> {sub}</span>}
      </div>
      <div className={`text-[16px] font-semibold tracking-[-0.01em] ${accent ? 'text-accent' : 'text-ink'}`}>
        {value}
      </div>
    </div>
  )
}

const ZONE_COLORS = ['#4ade80', '#a3e635', '#facc15', '#fb923c', '#f87171']

function HrZoneBar({ run }) {
  const zones = [run.hr_zone1_s, run.hr_zone2_s, run.hr_zone3_s, run.hr_zone4_s, run.hr_zone5_s].map(v => v ?? 0)
  const total = zones.reduce((a, b) => a + b, 0)
  if (!total) return null

  return (
    <div className="mb-5">
      <div className={SECTION_TITLE}>HR Zone Distribution</div>
      <div className="flex h-5 rounded-sm overflow-hidden gap-px">
        {zones.map((z, i) => z > 0 && (
          <div key={i}
            title={`Z${i+1}: ${Math.round(z/60)}m (${Math.round(z/total*100)}%)`}
            className="transition-[flex] duration-300"
            style={{ flex: z, background: ZONE_COLORS[i] }}
          />
        ))}
      </div>
      <div className="flex gap-3 mt-1.5">
        {zones.map((z, i) => z > 0 && (
          <div key={i} className="flex items-center gap-1 text-[10px] text-ink-3">
            <div className="w-2 h-2 rounded-sm" style={{ background: ZONE_COLORS[i] }} />
            Z{i+1} {Math.round(z/total*100)}%
          </div>
        ))}
      </div>
    </div>
  )
}
