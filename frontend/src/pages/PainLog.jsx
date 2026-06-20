import { useState } from 'react'
import { Zap } from 'lucide-react'
import TopBar from '../components/layout/TopBar.jsx'
import Button from '../components/ui/Button.jsx'
import Spinner from '../components/ui/Spinner.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import { useFetch } from '../hooks/useFetch.js'
import { api } from '../api/client.js'
import { formatDate, today } from '../utils/format.js'

const BODY_PARTS = ['knee', 'hip', 'shin', 'calf', 'foot', 'ankle', 'back', 'shoulder', 'other']

const SEVERITY_COLOR = ['', '#00ff87', '#9aff59', '#ffb340', '#ff7a40', '#ff4d6a']
const SEVERITY_LABEL = ['', 'Minimal', 'Mild', 'Moderate', 'Severe', 'Extreme']

function usePainLog() {
  return useFetch(() => api.getPainLog({ limit: 100 }), [])
}

const LABEL_CLS = 'text-[10px] font-semibold tracking-[0.1em] uppercase text-ink-2'
const INPUT_CLS = 'bg-input border border-border rounded text-ink px-3 py-2 outline-none focus:border-accent transition-colors'
const SECTION_LABEL = 'text-[10px] text-ink-3 uppercase tracking-[0.1em] mb-2'

export default function PainLog() {
  const { data: entries, loading, refetch } = usePainLog()
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({ date: today(), body_part: 'knee', severity: 3, description: '' })
  const [saving, setSaving] = useState(false)

  function set(k, v) {
    setForm(f => ({ ...f, [k]: v }))
  }

  function resetForm() {
    setForm({ date: today(), body_part: 'knee', severity: 3, description: '' })
    setSelected(null)
  }

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.createPainEntry(form)
      await refetch()
      resetForm()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-7 max-w-[1280px]">
      <TopBar title="Pain Log" />

      <div className="grid grid-cols-[280px,1fr] gap-4 h-[calc(100vh-112px)]">
        {/* List */}
        <div className="border border-border rounded bg-card flex flex-col overflow-y-auto">
          {loading ? <Spinner /> : !entries?.length ? (
            <EmptyState icon={Zap} title="No pain entries" description="Track pain and injuries here." />
          ) : (
            (entries || []).map(entry => (
              <div
                key={entry.id}
                onClick={() => setSelected(entry)}
                className={[
                  'px-4 py-3.5 border-b border-border last:border-b-0 cursor-pointer transition-colors',
                  selected?.id === entry.id
                    ? 'bg-accent/8 border-l-2 border-l-accent'
                    : 'hover:bg-hover',
                ].join(' ')}
              >
                <div className="text-[10px] font-semibold tracking-[0.08em] uppercase text-ink-3 mb-1">
                  {formatDate(entry.date)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold capitalize">{entry.body_part}</span>
                  <SeverityDots severity={entry.severity} />
                </div>
                {entry.description && (
                  <div className="text-[11px] text-ink-3 mt-1 leading-relaxed">
                    {entry.description.slice(0, 60)}{entry.description.length > 60 ? '…' : ''}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Form or detail */}
        <div className="border border-border rounded bg-card p-6 overflow-y-auto flex flex-col gap-4">
          {selected ? (
            <PainDetail entry={selected} onClose={resetForm} />
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-4">
              <div className="text-[10px] font-bold tracking-[0.12em] uppercase text-ink-3">
                Log Pain Entry
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={LABEL_CLS}>Date</label>
                <input type="date" value={form.date} onChange={e => set('date', e.target.value)} required
                  className={INPUT_CLS} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={LABEL_CLS}>Body Part</label>
                <select value={form.body_part} onChange={e => set('body_part', e.target.value)}
                  className={INPUT_CLS}>
                  {BODY_PARTS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={LABEL_CLS}>
                  Severity "” <span className="font-bold" style={{ color: SEVERITY_COLOR[form.severity] }}>
                    {SEVERITY_LABEL[form.severity]}
                  </span>
                </label>
                <div className="flex flex-col gap-2.5">
                  <input
                    type="range" min={1} max={5} value={form.severity}
                    onChange={e => set('severity', parseInt(e.target.value))}
                    className="w-full cursor-pointer accent-accent"
                  />
                  <div className="flex gap-3 items-center justify-between px-1">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => set('severity', n)}
                        className="w-3 h-3 rounded-full border-none cursor-pointer transition-transform duration-150"
                        style={{
                          background:  form.severity >= n ? SEVERITY_COLOR[n] : '#1c1c22',
                          transform:   form.severity === n ? 'scale(1.4)' : 'scale(1)',
                        }}
                        title={SEVERITY_LABEL[n]}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={LABEL_CLS}>Description</label>
                <textarea
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                  placeholder="Describe the pain, when it started, activity triggers..."
                  className={`${INPUT_CLS} min-h-[120px] resize-y`}
                />
              </div>

              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Log Pain Entry'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

function SeverityDots({ severity }) {
  return (
    <div className="flex gap-[3px] items-center">
      {[1, 2, 3, 4, 5].map(n => (
        <div key={n} className="w-1.5 h-1.5 rounded-full"
          style={{ background: severity >= n ? SEVERITY_COLOR[n] : '#1c1c22' }} />
      ))}
    </div>
  )
}

function PainDetail({ entry, onClose }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-start">
        <div>
          <div className="text-[10px] text-ink-3 uppercase tracking-[0.1em] mb-1">{formatDate(entry.date)}</div>
          <div className="text-[20px] font-bold">{entry.body_part}</div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
      </div>

      <div>
        <div className={SECTION_LABEL}>Severity</div>
        <div className="flex items-center gap-2.5">
          <SeverityDots severity={entry.severity} />
          <span className="text-sm font-bold" style={{ color: SEVERITY_COLOR[entry.severity] }}>
            {SEVERITY_LABEL[entry.severity]} ({entry.severity}/5)
          </span>
        </div>
      </div>

      {entry.description && (
        <div>
          <div className={SECTION_LABEL}>Notes</div>
          <div className="text-[13px] text-ink leading-[1.7]">{entry.description}</div>
        </div>
      )}
    </div>
  )
}

