import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Activity } from 'lucide-react'
import TopBar from '../components/layout/TopBar.jsx'
import Card from '../components/ui/Card.jsx'
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

const fmtTime = (s) => s != null ? formatDuration(s) : null
const fmtMs   = (ms) => ms != null ? `${Math.round(ms)} ms` : null
const fmtCm   = (cm) => cm != null ? `${cm.toFixed(1)} cm` : null
const fmtPct  = (v)  => v  != null ? `${v}%` : null
const fmtWatt = (w)  => w  != null ? `${Math.round(w)} W` : null
const fmtCad  = (c)  => c  != null ? `${c} spm` : null
const fmtSpeed = (ms) => ms != null ? `${(ms * 3.6).toFixed(1)} km/h` : null

export default function RunDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: run, loading, error } = useActivity(id)

  return (
    <div className="page">
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
          <div style={styles.hero}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <div style={styles.heroDate}>{formatDate(run.date)}</div>
                <div style={styles.heroName}>{run.name || 'Run'}</div>
                {run.location_name && <div style={styles.heroLoc}>{run.location_name}</div>}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {run.is_pr ? <Badge color="accent">PR</Badge> : null}
                {run.training_effect_label && <Badge>{run.training_effect_label}</Badge>}
                <Badge>{run.source}</Badge>
              </div>
            </div>
            <div style={styles.heroDistance}>{formatDistance(run.distance_m)}</div>
          </div>

          {/* Primary stats */}
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

          {/* Heart rate */}
          <StatSection title="Heart Rate">
            <Stat label="Avg HR"   value={run.avg_hr ? `${run.avg_hr} bpm` : null} />
            <Stat label="Max HR"   value={run.max_hr ? `${run.max_hr} bpm` : null} />
            <Stat label="Zone 1"   value={fmtTime(run.hr_zone1_s)} sub="<60%" />
            <Stat label="Zone 2"   value={fmtTime(run.hr_zone2_s)} sub="60–70%" />
            <Stat label="Zone 3"   value={fmtTime(run.hr_zone3_s)} sub="70–80%" />
            <Stat label="Zone 4"   value={fmtTime(run.hr_zone4_s)} sub="80–90%" />
            <Stat label="Zone 5"   value={fmtTime(run.hr_zone5_s)} sub=">90%" />
          </StatSection>

          {/* HR Zone bar */}
          {(run.hr_zone1_s || run.hr_zone2_s || run.hr_zone3_s || run.hr_zone4_s || run.hr_zone5_s) && (
            <HrZoneBar run={run} />
          )}

          {/* Elevation */}
          <StatSection title="Elevation">
            <Stat label="Gain"  value={run.elevation_m      != null ? `${Math.round(run.elevation_m)} m`      : null} />
            <Stat label="Loss"  value={run.elevation_loss_m != null ? `${Math.round(run.elevation_loss_m)} m` : null} />
          </StatSection>

          {/* Running dynamics */}
          {(run.avg_cadence || run.avg_stride_length_m || run.avg_vertical_oscillation) && (
            <StatSection title="Running Dynamics">
              <Stat label="Avg Cadence"    value={fmtCad(run.avg_cadence)} />
              <Stat label="Max Cadence"    value={fmtCad(run.max_cadence)} />
              <Stat label="Stride Length"  value={run.avg_stride_length_m ? `${run.avg_stride_length_m.toFixed(2)} m` : null} />
              <Stat label="Vert. Osc."     value={fmtCm(run.avg_vertical_oscillation)} />
              <Stat label="GCT"            value={fmtMs(run.avg_ground_contact_time)} />
              <Stat label="Vert. Ratio"    value={run.avg_vertical_ratio ? `${run.avg_vertical_ratio.toFixed(1)}%` : null} />
            </StatSection>
          )}

          {/* Power */}
          {(run.avg_power || run.norm_power) && (
            <StatSection title="Power">
              <Stat label="Avg Power"  value={fmtWatt(run.avg_power)} />
              <Stat label="Max Power"  value={fmtWatt(run.max_power)} />
              <Stat label="NP"         value={fmtWatt(run.norm_power)} />
            </StatSection>
          )}

          {/* Training load */}
          {(run.aerobic_te || run.vo2max) && (
            <StatSection title="Training Load">
              <Stat label="Aerobic TE"    value={run.aerobic_te   ? run.aerobic_te.toFixed(1)   : null} />
              <Stat label="Anaerobic TE"  value={run.anaerobic_te ? run.anaerobic_te.toFixed(1) : null} />
              <Stat label="VO2 Max"       value={run.vo2max       ? run.vo2max.toFixed(1)        : null} />
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
    <div style={{ marginBottom: 20 }}>
      <div style={styles.sectionTitle}>{title}</div>
      <div style={styles.statGrid}>{visible}</div>
    </div>
  )
}

function Stat({ label, value, sub, accent }) {
  if (value == null) return null
  return (
    <div style={styles.stat}>
      <div style={styles.statLabel}>{label}{sub && <span style={styles.statSub}> {sub}</span>}</div>
      <div style={{ ...styles.statValue, ...(accent ? { color: 'var(--accent)' } : {}) }}>{value}</div>
    </div>
  )
}

const ZONE_COLORS = ['#4ade80', '#a3e635', '#facc15', '#fb923c', '#f87171']

function HrZoneBar({ run }) {
  const zones = [run.hr_zone1_s, run.hr_zone2_s, run.hr_zone3_s, run.hr_zone4_s, run.hr_zone5_s].map(v => v ?? 0)
  const total = zones.reduce((a, b) => a + b, 0)
  if (!total) return null

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={styles.sectionTitle}>HR Zone Distribution</div>
      <div style={{ display: 'flex', height: 20, borderRadius: 2, overflow: 'hidden', gap: 1 }}>
        {zones.map((z, i) => z > 0 && (
          <div key={i} title={`Z${i+1}: ${Math.round(z/60)}m (${Math.round(z/total*100)}%)`}
            style={{ flex: z, background: ZONE_COLORS[i], transition: 'flex 0.3s' }} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
        {zones.map((z, i) => z > 0 && (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text-3)' }}>
            <div style={{ width: 8, height: 8, borderRadius: 1, background: ZONE_COLORS[i] }} />
            Z{i+1} {Math.round(z/total*100)}%
          </div>
        ))}
      </div>
    </div>
  )
}

const styles = {
  hero: {
    marginBottom: 24,
    paddingBottom: 20,
    borderBottom: '1px solid var(--border)',
  },
  heroDate: { fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 },
  heroName: { fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 },
  heroLoc:  { fontSize: 12, color: 'var(--text-2)', marginBottom: 10 },
  heroDistance: { fontSize: 52, fontWeight: 800, color: 'var(--accent)', letterSpacing: '-0.04em', lineHeight: 1, marginTop: 12 },
  sectionTitle: {
    fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
    color: 'var(--text-3)', marginBottom: 10,
  },
  statGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: 8,
  },
  stat: {
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: '12px 14px',
  },
  statLabel: { fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 4 },
  statSub:   { fontSize: 9, color: 'var(--text-3)', fontWeight: 400 },
  statValue: { fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em' },
}
