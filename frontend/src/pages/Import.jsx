import { useState, useRef, useEffect } from 'react'
import { Upload, RefreshCw, Link, Download } from 'lucide-react'
import TopBar from '../components/layout/TopBar.jsx'
import Card from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import Spinner from '../components/ui/Spinner.jsx'
import { useFetch } from '../hooks/useFetch.js'
import { api } from '../api/client.js'

function useConfig() {
  return useFetch(() => api.getConfig(), [])
}

export default function Import() {
  const { data: config } = useConfig()

  return (
    <div className="page">
      <TopBar title="Import Data" />
      <div style={styles.sections}>
        <AppleHealthSection />
        <StravaSection config={config} />
        <GarminSection config={config} />
      </div>
    </div>
  )
}

function SectionHeader({ icon: Icon, title, sub }) {
  return (
    <div style={styles.sectionHeader}>
      <div style={styles.sectionIcon}><Icon size={16} style={{ color: 'var(--accent)' }} /></div>
      <div>
        <div style={styles.sectionTitle}>{title}</div>
        {sub && <div style={styles.sectionSub}>{sub}</div>}
      </div>
    </div>
  )
}

function ResultBanner({ result }) {
  if (!result) return null
  const ok = result.ok !== false
  return (
    <div style={{
      marginTop: 12,
      padding: '10px 14px',
      borderRadius: 'var(--radius)',
      border: `1px solid ${ok ? 'var(--accent-20)' : 'rgba(255,77,106,0.2)'}`,
      background: ok ? 'var(--accent-10)' : 'var(--danger-10)',
      fontSize: 12,
      color: ok ? 'var(--accent)' : 'var(--danger)',
    }}>
      {result.message || (ok
        ? `Done. Imported ${result.activitiesImported ?? result.imported ?? 0} activities, ${result.healthImported ?? 0} health records.`
        : 'Sync failed — check credentials.')}
    </div>
  )
}

function AppleHealthSection() {
  const fileRef = useRef()
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  function onFile(f) {
    if (f && f.name.endsWith('.xml')) setFile(f)
  }

  async function doImport() {
    if (!file) return
    setLoading(true)
    setResult(null)
    try {
      const r = await api.importAppleHealth(file)
      setResult(r)
      setFile(null)
    } catch (e) {
      setResult({ ok: false, message: e.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <SectionHeader icon={Download} title="Apple Health" sub="Export export.xml from iPhone → Health → Profile → Export All Health Data" />
      <div className="divider" />
      <div
        style={{
          ...styles.dropZone,
          ...(dragging ? styles.dropZoneActive : {}),
          ...(file ? styles.dropZoneReady : {}),
        }}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); onFile(e.dataTransfer.files[0]) }}
        onClick={() => fileRef.current.click()}
      >
        <Upload size={20} style={{ color: file ? 'var(--accent)' : 'var(--text-3)' }} />
        <div style={styles.dropText}>
          {file ? file.name : 'Drop export.xml here or click to browse'}
        </div>
        <input ref={fileRef} type="file" accept=".xml" style={{ display: 'none' }} onChange={e => onFile(e.target.files[0])} />
      </div>
      {file && (
        <div style={{ marginTop: 12 }}>
          <Button onClick={doImport} disabled={loading}>
            {loading ? <><Spinner size={14} />Parsing…</> : 'Import'}
          </Button>
        </div>
      )}
      <ResultBanner result={result} />
    </Card>
  )
}

function StravaSection({ config }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const connected = config?.strava_access_token

  async function sync() {
    setLoading(true)
    setResult(null)
    try {
      const r = await api.syncStrava()
      setResult(r)
    } catch (e) {
      setResult({ ok: false, message: e.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <SectionHeader
        icon={RefreshCw}
        title="Strava"
        sub={connected ? `Connected · last sync: ${config.strava_last_sync?.slice(0, 10) || 'never'}` : 'Not connected'}
      />
      <div className="divider" />
      <div style={styles.buttonRow}>
        {!connected ? (
          <Button onClick={() => window.location.href = '/api/sync/strava/auth'}>
            <Link size={13} /> Connect Strava
          </Button>
        ) : (
          <>
            <Button onClick={sync} disabled={loading}>
              <RefreshCw size={13} style={loading ? styles.spin : {}} />
              {loading ? 'Syncing…' : 'Sync Activities'}
            </Button>
            <Button variant="ghost" onClick={() => window.location.href = '/api/sync/strava/auth'}>
              Reconnect
            </Button>
          </>
        )}
      </div>
      <ResultBanner result={result} />
    </Card>
  )
}

function GarminSection({ config }) {
  const [form, setForm] = useState({ garmin_email: config?.garmin_email || '', garmin_password: '' })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const logRef = useRef(null)

  async function sync() {
    setLoading(true)
    setResult(null)
    try {
      const patch = {}
      if (form.garmin_email)    patch.garmin_email    = form.garmin_email
      if (form.garmin_password) patch.garmin_password = form.garmin_password
      if (Object.keys(patch).length) await api.saveConfig(patch)

      const r = await api.syncGarmin()
      setResult(r)
    } catch (e) {
      setResult({ ok: false, log: [], message: e.message })
    } finally {
      setLoading(false)
    }
  }

  // Auto-scroll log to bottom
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [result?.log])

  const lastSync = config?.garmin_last_sync
  const hasCredentials = config?.garmin_email

  return (
    <Card>
      <SectionHeader
        icon={RefreshCw}
        title="Garmin"
        sub={hasCredentials
          ? `${config.garmin_email} · last sync: ${lastSync ? lastSync.slice(0, 16).replace('T', ' ') : 'never'}`
          : 'Enter credentials to sync'}
      />
      <div className="divider" />

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Email</label>
          <input
            type="email"
            placeholder="you@garmin.com"
            value={form.garmin_email}
            onChange={e => setForm(f => ({ ...f, garmin_email: e.target.value }))}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Password</label>
          <input
            type="password"
            placeholder="••••••••"
            value={form.garmin_password}
            onChange={e => setForm(f => ({ ...f, garmin_password: e.target.value }))}
          />
        </div>
      </div>

      <Button
        onClick={sync}
        disabled={loading || (!form.garmin_email && !hasCredentials)}
        size="md"
      >
        <RefreshCw size={13} style={loading ? styles.spin : {}} />
        {loading ? 'Syncing…' : 'Sync Garmin'}
      </Button>

      {/* Log output */}
      {result && (
        <div style={styles.logWrap}>
          <div style={styles.logHeader}>
            <span style={{ color: result.ok ? 'var(--accent)' : 'var(--danger)' }}>
              {result.ok
                ? `✓ Done — ${result.activitiesImported} activities, ${result.healthImported} health days`
                : `✗ ${result.message}`}
            </span>
          </div>
          {result.log?.length > 0 && (
            <pre ref={logRef} style={styles.log}>
              {result.log.join('\n')}
            </pre>
          )}
        </div>
      )}
    </Card>
  )
}

const styles = {
  sections: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    maxWidth: 720,
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 'var(--radius)',
    background: 'var(--accent-10)',
    border: '1px solid var(--accent-20)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: '-0.01em',
  },
  sectionSub: {
    fontSize: 11,
    color: 'var(--text-3)',
    marginTop: 2,
  },
  dropZone: {
    border: '1px dashed var(--border)',
    borderRadius: 'var(--radius)',
    padding: '28px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  dropZoneActive: {
    borderColor: 'var(--accent)',
    background: 'var(--accent-10)',
  },
  dropZoneReady: {
    borderColor: 'var(--accent)',
    borderStyle: 'solid',
    background: 'var(--accent-10)',
  },
  dropText: {
    fontSize: 12,
    color: 'var(--text-2)',
    textAlign: 'center',
  },
  buttonRow: {
    display: 'flex',
    gap: 8,
  },
  spin: {
    animation: 'spin 1s linear infinite',
  },
  logWrap: {
    marginTop: 14,
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    overflow: 'hidden',
  },
  logHeader: {
    padding: '8px 12px',
    background: 'var(--bg)',
    borderBottom: '1px solid var(--border)',
    fontSize: 12,
    fontWeight: 600,
  },
  log: {
    margin: 0,
    padding: '10px 12px',
    background: 'var(--bg-input)',
    fontSize: 11,
    lineHeight: 1.7,
    color: 'var(--text-2)',
    maxHeight: 260,
    overflowY: 'auto',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
}
