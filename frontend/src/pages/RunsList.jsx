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
    <div className="px-4 py-5 md:p-7 max-w-[1280px]">
      <TopBar title="Runs">
        <Button variant="ghost" size="sm" onClick={() => setShowAdd(v => !v)}>
          <Plus size={13} /> Log run
        </Button>
      </TopBar>

      <Card className="mb-4 !p-3">
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold tracking-[0.1em] uppercase text-ink-3">From</label>
            <input
              type="date" value={from}
              onChange={e => { setFrom(e.target.value); setPage(0) }}
              className="bg-input border border-border rounded text-ink px-2.5 py-1.5 outline-none focus:border-accent transition-colors text-xs !w-auto min-w-[130px]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold tracking-[0.1em] uppercase text-ink-3">To</label>
            <input
              type="date" value={to}
              onChange={e => { setTo(e.target.value); setPage(0) }}
              className="bg-input border border-border rounded text-ink px-2.5 py-1.5 outline-none focus:border-accent transition-colors text-xs !w-auto min-w-[130px]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold tracking-[0.1em] uppercase text-ink-3">Source</label>
            <select
              value={source}
              onChange={e => { setSource(e.target.value); setPage(0) }}
              className="bg-input border border-border rounded text-ink px-2.5 py-1.5 outline-none focus:border-accent transition-colors text-xs !w-auto min-w-[130px]"
            >
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

      <Card className="!p-0">
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
            <div className="overflow-x-auto -mx-0"><table className="w-full border-collapse min-w-[500px]">
              <thead>
                <tr>
                  {['Date','Name','Distance','Duration','Pace','Avg HR','Source'].map(h => (
                    <th key={h} className="text-left text-[10px] font-semibold tracking-[0.12em] uppercase text-ink-3 px-4 pb-2.5 border-b border-border">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {page_runs.map(run => (
                  <tr key={run.id} onClick={() => navigate(`/runs/${run.id}`)}
                    className="border-b border-border last:border-b-0 cursor-pointer transition-colors hover:[&>td]:bg-hover">
                    <td className="px-4 py-3 text-[12px] text-ink-2">{formatDate(run.date)}</td>
                    <td className="px-4 py-3 max-w-[180px] overflow-hidden text-ellipsis whitespace-nowrap text-[13px]">
                      {run.name || <span className="text-ink-3">Ã¢â‚¬â€</span>}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-accent font-semibold">{formatDistance(run.distance_m)}</td>
                    <td className="px-4 py-3 text-[13px]">{formatDuration(run.duration_s)}</td>
                    <td className="px-4 py-3 text-[13px]">{formatPace(run.avg_pace_s)}</td>
                    <td className="px-4 py-3 text-[13px]">{run.avg_hr ? `${run.avg_hr} bpm` : 'Ã¢â‚¬â€'}</td>
                    <td className="px-4 py-3 text-[11px] text-ink-3">{run.source}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
            {hasMore && (
              <div className="px-4 py-3 border-t border-border text-center">
                <span className="text-xs text-ink-3">Showing {PAGE_SIZE} results</span>
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
    <Card className="mb-4">
      <div className="text-[11px] font-bold tracking-[0.1em] uppercase text-ink-3 mb-4">Log Run</div>
      <form onSubmit={submit}>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1.5 mb-4">
            <label className="text-[10px] font-semibold tracking-[0.1em] uppercase text-ink-2">Date</label>
            <input type="date" value={form.date} onChange={e => set('date', e.target.value)} required
              className="bg-input border border-border rounded text-ink px-3 py-2 outline-none focus:border-accent transition-colors" />
          </div>
          <div className="flex flex-col gap-1.5 mb-4">
            <label className="text-[10px] font-semibold tracking-[0.1em] uppercase text-ink-2">Name</label>
            <input type="text" placeholder="Morning run" value={form.name} onChange={e => set('name', e.target.value)}
              className="bg-input border border-border rounded text-ink px-3 py-2 outline-none focus:border-accent transition-colors" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1.5 mb-4">
            <label className="text-[10px] font-semibold tracking-[0.1em] uppercase text-ink-2">Distance (km)</label>
            <input type="number" step="0.01" placeholder="10.0" value={form.distance_km} onChange={e => set('distance_km', e.target.value)}
              className="bg-input border border-border rounded text-ink px-3 py-2 outline-none focus:border-accent transition-colors" />
          </div>
          <div className="flex flex-col gap-1.5 mb-4">
            <label className="text-[10px] font-semibold tracking-[0.1em] uppercase text-ink-2">Duration (min)</label>
            <input type="number" step="0.5" placeholder="55" value={form.duration_min} onChange={e => set('duration_min', e.target.value)}
              className="bg-input border border-border rounded text-ink px-3 py-2 outline-none focus:border-accent transition-colors" />
          </div>
        </div>
        <div className="flex flex-col gap-1.5 mb-4 max-w-[200px]">
          <label className="text-[10px] font-semibold tracking-[0.1em] uppercase text-ink-2">Avg HR (bpm)</label>
          <input type="number" placeholder="145" value={form.avg_hr} onChange={e => set('avg_hr', e.target.value)}
            className="bg-input border border-border rounded text-ink px-3 py-2 outline-none focus:border-accent transition-colors" />
        </div>
        <div className="flex gap-2 mt-1">
          <Button type="submit" disabled={saving}>{saving ? 'SavingÃ¢â‚¬Â¦' : 'Save'}</Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Card>
  )
}
