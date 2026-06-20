import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, Plus } from 'lucide-react'
import TopBar from '../components/layout/TopBar.jsx'
import Card from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import Spinner from '../components/ui/Spinner.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import { useActivities } from '../hooks/useActivities.js'
import { formatPace, formatDistance, formatDuration, formatDate } from '../utils/format.js'
import { api } from '../api/client.js'

const SOURCES = ['all', 'strava', 'garmin', 'apple_health', 'manual']
const PAGE_SIZE = 25

export default function RunsList() {
  const navigate = useNavigate()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [source, setSource] = useState('all')
  const [page, setPage] = useState(0)
  const [showAdd, setShowAdd] = useState(false)

  const params = { type: 'run', limit: PAGE_SIZE + 1 }
  if (from)   params.from = from
  if (to)     params.to = to
  if (source !== 'all') params.source = source

  const { data: runs, loading, error, refetch } = useActivities(params)
  const hasMore = runs?.length > PAGE_SIZE
  const page_runs = (runs || []).slice(0, PAGE_SIZE)

  return (
    <div className="page">
      <TopBar title="Runs">
        <Button variant="ghost" size="sm" onClick={() => setShowAdd(v => !v)}>
          <Plus size={13} /> Log run
        </Button>
      </TopBar>

      <Card style={{ marginBottom: 16 }} padding="12px 16px">
        <div style={styles.filters}>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>From</label>
            <input type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(0) }} style={styles.filterInput} />
          </div>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>To</label>
            <input type="date" value={to} onChange={e => { setTo(e.target.value); setPage(0) }} style={styles.filterInput} />
          </div>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Source</label>
            <select value={source} onChange={e => { setSource(e.target.value); setPage(0) }} style={styles.filterInput}>
              {SOURCES.map(s => <option key={s} value={s}>{s === 'all' ? 'All sources' : s}</option>)}
            </select>
          </div>
          {(from || to || source !== 'all') && (
            <Button variant="ghost" size="sm" onClick={() => { setFrom(''); setTo(''); setSource('all') }}>
              Clear
            </Button>
          )}
        </div>
      </Card>

      {showAdd && <AddRunForm onClose={() => setShowAdd(false)} onSaved={refetch} />}

      <Card padding="0">
        {loading ? <Spinner /> : error ? (
          <EmptyState title="Error loading runs" description={error} />
        ) : !page_runs.length ? (
          <EmptyState
            icon={Activity}
            title="No runs found"
            description="Import activities or log a run manually."
          />
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Name</th>
                  <th>Distance</th>
                  <th>Duration</th>
                  <th>Pace</th>
                  <th>Avg HR</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {page_runs.map(run => (
                  <tr key={run.id} onClick={() => navigate(`/runs/${run.id}`)}>
                    <td style={{ color: 'var(--text-2)', fontSize: 12 }}>{formatDate(run.date)}</td>
                    <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {run.name || <span style={{ color: 'var(--text-3)' }}>—</span>}
                    </td>
                    <td style={{ color: 'var(--accent)', fontWeight: 600 }}>{formatDistance(run.distance_m)}</td>
                    <td>{formatDuration(run.duration_s)}</td>
                    <td>{formatPace(run.avg_pace_s)}</td>
                    <td>{run.avg_hr ? `${run.avg_hr} bpm` : '—'}</td>
                    <td style={{ color: 'var(--text-3)', fontSize: 11 }}>{run.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {hasMore && (
              <div style={styles.moreRow}>
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Showing {PAGE_SIZE} results</span>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  )
}

function AddRunForm({ onClose, onSaved }) {
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), name: '', distance_km: '', duration_min: '', avg_hr: '' })
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const distance_m = form.distance_km ? parseFloat(form.distance_km) * 1000 : null
      const duration_s = form.duration_min ? parseFloat(form.duration_min) * 60 : null
      const avg_pace_s = distance_m && duration_s ? Math.round(duration_s / (distance_m / 1000)) : null
      await api.createActivity({ date: form.date, name: form.name || null, distance_m, duration_s, avg_pace_s, avg_hr: form.avg_hr ? parseInt(form.avg_hr) : null, source: 'manual', type: 'run' })
      onSaved()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card style={{ marginBottom: 16 }} padding="20px">
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 16 }}>Log Run</div>
      <form onSubmit={submit}>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Date</label><input type="date" value={form.date} onChange={e => set('date', e.target.value)} required /></div>
          <div className="form-group"><label className="form-label">Name</label><input type="text" placeholder="Morning run" value={form.name} onChange={e => set('name', e.target.value)} /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Distance (km)</label><input type="number" step="0.01" placeholder="10.0" value={form.distance_km} onChange={e => set('distance_km', e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Duration (min)</label><input type="number" step="0.5" placeholder="55" value={form.duration_min} onChange={e => set('duration_min', e.target.value)} /></div>
        </div>
        <div className="form-group" style={{ maxWidth: 200 }}><label className="form-label">Avg HR (bpm)</label><input type="number" placeholder="145" value={form.avg_hr} onChange={e => set('avg_hr', e.target.value)} /></div>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Card>
  )
}

const styles = {
  filters: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 12,
    flexWrap: 'wrap',
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  filterLabel: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--text-3)',
  },
  filterInput: {
    padding: '6px 10px',
    fontSize: 12,
    width: 'auto',
    minWidth: 130,
  },
  moreRow: {
    padding: '12px 16px',
    borderTop: '1px solid var(--border)',
    textAlign: 'center',
  },
}
