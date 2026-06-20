import { useState, useEffect } from 'react'
import { Settings as SettingsIcon, Save, Bot } from 'lucide-react'
import TopBar from '../components/layout/TopBar.jsx'
import Card from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import Spinner from '../components/ui/Spinner.jsx'
import { useFetch } from '../hooks/useFetch.js'
import { api } from '../api/client.js'

const AI_PROVIDERS = [
  { value: 'disabled', label: 'Disabled' },
  { value: 'anthropic', label: 'Anthropic (Claude)' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'ollama', label: 'Ollama (local)' },
]

function useConfig() {
  return useFetch(() => api.getConfig(), [])
}

export default function Settings() {
  const { data: config, loading } = useConfig()
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (config) setForm(config)
  }, [config])

  function set(k, v) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    try {
      const payload = { ...form }
      // Don't send masked values back
      for (const [k, v] of Object.entries(payload)) {
        if (v === '••••••••') delete payload[k]
      }
      await api.saveConfig(payload)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  const aiProvider = form.ai_provider || 'disabled'

  if (loading) return <div className="page"><TopBar title="Settings" /><Spinner /></div>

  return (
    <div className="page">
      <TopBar title="Settings" />
      <form onSubmit={save} style={styles.form}>

        {/* Strava */}
        <Card>
          <div style={styles.cardTitle}>Strava</div>
          <div className="divider" />
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Client ID</label>
              <input value={form.strava_client_id || ''} onChange={e => set('strava_client_id', e.target.value)} placeholder="12345" />
            </div>
            <div className="form-group">
              <label className="form-label">Client Secret</label>
              <input type="password" value={form.strava_client_secret || ''} onChange={e => set('strava_client_secret', e.target.value)} placeholder="••••••••" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Redirect URI</label>
            <input value={form.strava_redirect_uri || ''} onChange={e => set('strava_redirect_uri', e.target.value)} placeholder="http://localhost:3001/api/sync/strava/callback" />
          </div>
          {form.strava_athlete_id && (
            <div style={styles.info}>Connected as athlete ID {form.strava_athlete_id}</div>
          )}
        </Card>

        {/* Garmin */}
        <Card>
          <div style={styles.cardTitle}>Garmin</div>
          <div className="divider" />
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" value={form.garmin_email || ''} onChange={e => set('garmin_email', e.target.value)} placeholder="you@email.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input type="password" value={form.garmin_password || ''} onChange={e => set('garmin_password', e.target.value)} placeholder="••••••••" />
            </div>
          </div>
        </Card>

        {/* AI */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 0 }}>
            <div style={styles.cardTitle}>AI Integration</div>
            <div style={styles.phase2Badge}>Phase 2</div>
          </div>
          <div className="divider" />
          <div className="form-group">
            <label className="form-label">Provider</label>
            <select value={aiProvider} onChange={e => set('ai_provider', e.target.value)}>
              {AI_PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>

          {aiProvider === 'anthropic' && (
            <div className="form-group">
              <label className="form-label">Anthropic API Key</label>
              <input type="password" value={form.anthropic_api_key || ''} onChange={e => set('anthropic_api_key', e.target.value)} placeholder="sk-ant-••••••••" />
            </div>
          )}

          {aiProvider === 'openai' && (
            <div className="form-group">
              <label className="form-label">OpenAI API Key</label>
              <input type="password" value={form.openai_api_key || ''} onChange={e => set('openai_api_key', e.target.value)} placeholder="sk-••••••••" />
            </div>
          )}

          {aiProvider === 'ollama' && (
            <div className="form-group">
              <label className="form-label">Ollama Base URL</label>
              <input value={form.ollama_base_url || ''} onChange={e => set('ollama_base_url', e.target.value)} placeholder="http://mac-mini.local:11434" />
            </div>
          )}

          {aiProvider !== 'disabled' && (
            <div style={styles.infoBox}>
              <Bot size={14} style={{ flexShrink: 0, color: 'var(--text-3)' }} />
              <span>AI features are scaffolded for Phase 2. Save your settings here so they're ready when the AI chat is enabled.</span>
            </div>
          )}
        </Card>

        <div style={styles.saveRow}>
          <Button type="submit" disabled={saving}>
            <Save size={13} />
            {saving ? 'Saving…' : 'Save Settings'}
          </Button>
          {saved && <span style={styles.savedMsg}>Saved</span>}
        </div>
      </form>
    </div>
  )
}

const styles = {
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    maxWidth: 720,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--text-2)',
  },
  phase2Badge: {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    padding: '2px 6px',
    borderRadius: 2,
    background: 'var(--warning-10)',
    color: 'var(--warning)',
    border: '1px solid rgba(255,179,64,0.2)',
  },
  info: {
    fontSize: 11,
    color: 'var(--text-3)',
    marginTop: 4,
  },
  infoBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    padding: '10px 14px',
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    fontSize: 11,
    color: 'var(--text-3)',
    lineHeight: 1.6,
    marginTop: 4,
  },
  saveRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  savedMsg: {
    fontSize: 12,
    color: 'var(--accent)',
    fontWeight: 600,
  },
}
