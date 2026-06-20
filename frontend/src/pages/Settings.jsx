import { useState, useEffect } from 'react'
import { Save, Bot } from 'lucide-react'
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

const LABEL_CLS = 'text-[10px] font-semibold tracking-[0.1em] uppercase text-ink-2'
const INPUT_CLS = 'bg-input border border-border rounded text-ink px-3 py-2 outline-none focus:border-accent transition-colors'
const CARD_TITLE = 'text-[11px] font-bold tracking-[0.12em] uppercase text-ink-2'
const DIVIDER = <div className="h-px bg-border my-5" />

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
      for (const [k, v] of Object.entries(payload)) {
        if (v === 'â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢') delete payload[k]
      }
      await api.saveConfig(payload)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  const aiProvider = form.ai_provider || 'disabled'

  if (loading) return (
    <div className="px-4 py-5 md:p-7 max-w-[1280px]">
      <TopBar title="Settings" /><Spinner />
    </div>
  )

  return (
    <div className="px-4 py-5 md:p-7 max-w-[1280px]">
      <TopBar title="Settings" />
      <form onSubmit={save} className="flex flex-col gap-4 max-w-[720px]">

        {/* Strava */}
        <Card>
          <div className={CARD_TITLE}>Strava</div>
          {DIVIDER}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="flex flex-col gap-1.5">
              <label className={LABEL_CLS}>Client ID</label>
              <input value={form.strava_client_id || ''} onChange={e => set('strava_client_id', e.target.value)} placeholder="12345"
                className={INPUT_CLS} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL_CLS}>Client Secret</label>
              <input type="password" value={form.strava_client_secret || ''} onChange={e => set('strava_client_secret', e.target.value)} placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                className={INPUT_CLS} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5 mb-1">
            <label className={LABEL_CLS}>Redirect URI</label>
            <input value={form.strava_redirect_uri || ''} onChange={e => set('strava_redirect_uri', e.target.value)} placeholder="http://localhost:3001/api/sync/strava/callback"
              className={INPUT_CLS} />
          </div>
          {form.strava_athlete_id && (
            <div className="text-[11px] text-ink-3 mt-1">Connected as athlete ID {form.strava_athlete_id}</div>
          )}
        </Card>

        {/* Garmin */}
        <Card>
          <div className={CARD_TITLE}>Garmin</div>
          {DIVIDER}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={LABEL_CLS}>Email</label>
              <input type="email" value={form.garmin_email || ''} onChange={e => set('garmin_email', e.target.value)} placeholder="you@email.com"
                className={INPUT_CLS} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL_CLS}>Password</label>
              <input type="password" value={form.garmin_password || ''} onChange={e => set('garmin_password', e.target.value)} placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                className={INPUT_CLS} />
            </div>
          </div>
        </Card>

        {/* AI */}
        <Card>
          <div className="flex items-center gap-2.5">
            <div className={CARD_TITLE}>AI Integration</div>
            <span className="text-[9px] font-bold tracking-[0.1em] uppercase px-1.5 py-[2px] rounded-sm bg-warn/10 text-warn border border-warn/20">
              Phase 2
            </span>
          </div>
          {DIVIDER}
          <div className="flex flex-col gap-1.5 mb-4">
            <label className={LABEL_CLS}>Provider</label>
            <select value={aiProvider} onChange={e => set('ai_provider', e.target.value)} className={INPUT_CLS}>
              {AI_PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>

          {aiProvider === 'anthropic' && (
            <div className="flex flex-col gap-1.5 mb-4">
              <label className={LABEL_CLS}>Anthropic API Key</label>
              <input type="password" value={form.anthropic_api_key || ''} onChange={e => set('anthropic_api_key', e.target.value)} placeholder="sk-ant-â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                className={INPUT_CLS} />
            </div>
          )}

          {aiProvider === 'openai' && (
            <div className="flex flex-col gap-1.5 mb-4">
              <label className={LABEL_CLS}>OpenAI API Key</label>
              <input type="password" value={form.openai_api_key || ''} onChange={e => set('openai_api_key', e.target.value)} placeholder="sk-â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                className={INPUT_CLS} />
            </div>
          )}

          {aiProvider === 'ollama' && (
            <div className="flex flex-col gap-1.5 mb-4">
              <label className={LABEL_CLS}>Ollama Base URL</label>
              <input value={form.ollama_base_url || ''} onChange={e => set('ollama_base_url', e.target.value)} placeholder="http://mac-mini.local:11434"
                className={INPUT_CLS} />
            </div>
          )}

          {aiProvider !== 'disabled' && (
            <div className="flex items-start gap-2 px-3.5 py-2.5 bg-surface border border-border rounded text-[11px] text-ink-3 leading-relaxed mt-1">
              <Bot size={14} className="shrink-0 text-ink-3 mt-px" />
              <span>AI features are scaffolded for Phase 2. Save your settings here so they're ready when the AI chat is enabled.</span>
            </div>
          )}
        </Card>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving}>
            <Save size={13} />
            {saving ? 'Savingâ€¦' : 'Save Settings'}
          </Button>
          {saved && <span className="text-xs text-accent font-semibold">Saved</span>}
        </div>
      </form>
    </div>
  )
}

