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
    <div className="page">
      <TopBar title="Pain Log" />

      <div className="split-layout">
        {/* List */}
        <div className="split-list">
          {loading ? <Spinner /> : !entries?.length ? (
            <EmptyState icon={Zap} title="No pain entries" description="Track pain and injuries here." />
          ) : (
            (entries || []).map(entry => (
              <div
                key={entry.id}
                className={`list-item${selected?.id === entry.id ? ' active' : ''}`}
                onClick={() => setSelected(entry)}
              >
                <div style={styles.entryDate}>{formatDate(entry.date)}</div>
                <div style={styles.entryRow}>
                  <span style={styles.bodyPart}>{entry.body_part}</span>
                  <SeverityDots severity={entry.severity} />
                </div>
                {entry.description && (
                  <div style={styles.entryDesc}>{entry.description.slice(0, 60)}{entry.description.length > 60 ? '…' : ''}</div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Form or detail */}
        <div className="split-panel">
          {selected ? (
            <PainDetail entry={selected} onClose={resetForm} />
          ) : (
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
                Log Pain Entry
              </div>

              <div className="form-group">
                <label className="form-label">Date</label>
                <input type="date" value={form.date} onChange={e => set('date', e.target.value)} required />
              </div>

              <div className="form-group">
                <label className="form-label">Body Part</label>
                <select value={form.body_part} onChange={e => set('body_part', e.target.value)}>
                  {BODY_PARTS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Severity — <span style={{ color: SEVERITY_COLOR[form.severity], fontWeight: 700 }}>
                    {SEVERITY_LABEL[form.severity]}
                  </span>
                </label>
                <div style={styles.sliderWrap}>
                  <input
                    type="range" min={1} max={5} value={form.severity}
                    onChange={e => set('severity', parseInt(e.target.value))}
                    style={styles.slider}
                  />
                  <div style={styles.dotsRow}>
                    {[1, 2, 3, 4, 5].map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => set('severity', n)}
                        style={{
                          ...styles.dot,
                          background: form.severity >= n ? SEVERITY_COLOR[n] : 'var(--border)',
                          transform: form.severity === n ? 'scale(1.4)' : 'scale(1)',
                        }}
                        title={SEVERITY_LABEL[n]}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                  placeholder="Describe the pain, when it started, activity triggers..."
                  style={{ minHeight: 120 }}
                />
              </div>

              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Log Pain Entry'}
              </Button>
            </form>
          )}
        </div>
      </div>

      <style>{`
        input[type=range] { accent-color: var(--accent); }
      `}</style>
    </div>
  )
}

function SeverityDots({ severity }) {
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map(n => (
        <div key={n} style={{
          width: 6, height: 6, borderRadius: '50%',
          background: severity >= n ? SEVERITY_COLOR[n] : 'var(--border)',
        }} />
      ))}
    </div>
  )
}

function PainDetail({ entry, onClose }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{formatDate(entry.date)}</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{entry.body_part}</div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
      </div>

      <div>
        <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Severity</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <SeverityDots severity={entry.severity} />
          <span style={{ fontSize: 14, fontWeight: 700, color: SEVERITY_COLOR[entry.severity] }}>
            {SEVERITY_LABEL[entry.severity]} ({entry.severity}/5)
          </span>
        </div>
      </div>

      {entry.description && (
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Notes</div>
          <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.7 }}>{entry.description}</div>
        </div>
      )}
    </div>
  )
}

const styles = {
  entryDate: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.08em',
    color: 'var(--text-3)',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  entryRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bodyPart: {
    fontSize: 13,
    fontWeight: 600,
    textTransform: 'capitalize',
  },
  entryDesc: {
    fontSize: 11,
    color: 'var(--text-3)',
    marginTop: 4,
    lineHeight: 1.5,
  },
  sliderWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  slider: {
    width: '100%',
    cursor: 'pointer',
  },
  dotsRow: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 4px',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    transition: 'transform 0.15s, background 0.15s',
  },
}
