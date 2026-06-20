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

const LABEL_CLS = 'text-[10px] font-semibold tracking-[0.1em] uppercase text-ink-2'
const INPUT_CLS = 'bg-input border border-border rounded text-ink px-3 py-2 outline-none focus:border-accent transition-colors'

export default function Import() {
  const { data: config } = useConfig()

  return (
    <div className="px-4 py-5 md:p-7 max-w-[1280px]">
      <TopBar title="Import Data" />
      <div className="flex flex-col gap-4 max-w-[720px]">
        <AppleHealthSection />
        <StravaSection config={config} />
        <GarminSection config={config} />
      </div>
    </div>
  )
}

function SectionHeader({ icon: Icon, title, sub }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded bg-accent/8 border border-accent/18 flex items-center justify-center shrink-0 mt-0.5">
        <Icon size={16} className="text-accent" />
      </div>
      <div>
        <div className="text-[13px] font-bold tracking-[-0.01em] text-ink">{title}</div>
        {sub && <div className="text-[11px] text-ink-3 mt-0.5">{sub}</div>}
      </div>
    </div>
  )
}

function ResultBanner({ result }) {
  if (!result) return null
  const ok = result.ok !== false
  return (
    <div className={[
      'mt-3 px-3.5 py-2.5 rounded text-xs border',
      ok ? 'bg-accent/8 border-accent/18 text-accent' : 'bg-danger/8 border-danger/20 text-danger',
    ].join(' ')}>
      {result.message || (ok
        ? `Done. Imported ${result.activitiesImported ?? result.imported ?? 0} activities, ${result.healthImported ?? 0} health records.`
        : 'Sync failed "â€ check credentials.')}
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
      <SectionHeader icon={Download} title="Apple Health" sub="Export export.xml from iPhone â†’ Health â†’ Profile â†’ Export All Health Data" />
      <div className="h-px bg-border my-5" />
      <div
        className={[
          'border rounded flex flex-col items-center gap-2 py-7 px-5 cursor-pointer transition-all duration-150',
          dragging || file
            ? 'border-accent bg-accent/8 border-solid'
            : 'border-dashed border-border',
        ].join(' ')}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); onFile(e.dataTransfer.files[0]) }}
        onClick={() => fileRef.current.click()}
      >
        <Upload size={20} className={file ? 'text-accent' : 'text-ink-3'} />
        <div className="text-xs text-ink-2 text-center">
          {file ? file.name : 'Drop export.xml here or click to browse'}
        </div>
        <input ref={fileRef} type="file" accept=".xml" className="hidden" onChange={e => onFile(e.target.files[0])} />
      </div>
      {file && (
        <div className="mt-3">
          <Button onClick={doImport} disabled={loading}>
            {loading ? <><Spinner size={14} />Parsingâ€¦</> : 'Import'}
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
        sub={connected ? `Connected Â· last sync: ${config.strava_last_sync?.slice(0, 10) || 'never'}` : 'Not connected'}
      />
      <div className="h-px bg-border my-5" />
      <div className="flex gap-2">
        {!connected ? (
          <Button onClick={() => window.location.href = '/api/sync/strava/auth'}>
            <Link size={13} /> Connect Strava
          </Button>
        ) : (
          <>
            <Button onClick={sync} disabled={loading}>
              <RefreshCw size={13} className={loading ? 'animate-spin-slow' : ''} />
              {loading ? 'Syncingâ€¦' : 'Sync Activities'}
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
          ? `${config.garmin_email} Â· last sync: ${lastSync ? lastSync.slice(0, 16).replace('T', ' ') : 'never'}`
          : 'Enter credentials to sync'}
      />
      <div className="h-px bg-border my-5" />

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex flex-col gap-1.5">
          <label className={LABEL_CLS}>Email</label>
          <input
            type="email"
            placeholder="you@garmin.com"
            value={form.garmin_email}
            onChange={e => setForm(f => ({ ...f, garmin_email: e.target.value }))}
            className={INPUT_CLS}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={LABEL_CLS}>Password</label>
          <input
            type="password"
            placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
            value={form.garmin_password}
            onChange={e => setForm(f => ({ ...f, garmin_password: e.target.value }))}
            className={INPUT_CLS}
          />
        </div>
      </div>

      <Button
        onClick={sync}
        disabled={loading || (!form.garmin_email && !hasCredentials)}
      >
        <RefreshCw size={13} className={loading ? 'animate-spin-slow' : ''} />
        {loading ? 'Syncingâ€¦' : 'Sync Garmin'}
      </Button>

      {result && (
        <div className="mt-3.5 border border-border rounded overflow-hidden">
          <div className="px-3 py-2 bg-surface border-b border-border text-xs font-semibold">
            <span className={result.ok ? 'text-accent' : 'text-danger'}>
              {result.ok
                ? `âœ“ Done "" ${result.activitiesImported} activities, ${result.healthImported} health days`
                : `âœ— ${result.message}`}
            </span>
          </div>
          {result.log?.length > 0 && (
            <pre
              ref={logRef}
              className="m-0 px-3 py-2.5 bg-input text-[11px] leading-[1.7] text-ink-2 max-h-[260px] overflow-y-auto whitespace-pre-wrap break-words"
            >
              {result.log.join('\n')}
            </pre>
          )}
        </div>
      )}
    </Card>
  )
}

