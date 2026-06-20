import { useState } from 'react'
import { Bot, Sparkles, Copy, Check, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react'
import TopBar from '../components/layout/TopBar.jsx'
import Card from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import Spinner from '../components/ui/Spinner.jsx'
import Badge from '../components/ui/Badge.jsx'
import { useFetch } from '../hooks/useFetch.js'
import { api } from '../api/client.js'

function useAnalysis() {
  return useFetch(() => api.getAnalysis(), [])
}

const ST = 'text-[10px] font-bold tracking-[0.12em] uppercase text-ink-3'

export default function AIChat() {
  const { data: analysis, loading, refetch } = useAnalysis()
  const [promptVisible, setPromptVisible] = useState(false)
  const [prompt, setPrompt] = useState(null)
  const [loadingPrompt, setLoadingPrompt] = useState(false)
  const [copied, setCopied] = useState(false)

  async function loadPrompt() {
    setLoadingPrompt(true)
    try {
      const r = await api.getAiContext()
      setPrompt(r.prompt)
      setPromptVisible(true)
    } finally {
      setLoadingPrompt(false)
    }
  }

  async function copyPrompt() {
    if (!prompt) await loadPrompt()
    navigator.clipboard.writeText(prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="p-7 max-w-[1280px]">
      <TopBar title="Insights">
        <Button variant="ghost" size="sm" onClick={refetch} disabled={loading}>
          <RefreshCw size={13} className={loading ? 'animate-spin-slow' : ''} />
          Refresh
        </Button>
      </TopBar>

      {loading ? <Spinner /> : !analysis ? (
        <div className="text-[13px] text-ink-3">Not enough data to generate insights yet.</div>
      ) : (
        <div className="flex flex-col gap-4">

          {/* ── Score cards ── */}
          <div className="grid grid-cols-4 gap-3">
            <ScoreCard label="Recovery Readiness" value={analysis.scores.recovery} label2={analysis.scores.recovery_label} />
            <ScoreCard label="Training Risk"       value={analysis.scores.training_risk} label2={analysis.scores.risk_label} invert />
            <ScoreCard label="Sleep Quality"       value={analysis.scores.sleep_quality} />
            <ScoreCard label="Form Index"          value={analysis.scores.overall} />
          </div>

          {/* ── Flags ── */}
          {analysis.flags.length > 0 && (
            <Card className="!p-0">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <span className={ST}>Signals</span>
                <div className="flex gap-1.5">
                  {analysis.flags.filter(f => f.level === 'RED').length > 0 && (
                    <Badge color="danger">{analysis.flags.filter(f => f.level === 'RED').length} critical</Badge>
                  )}
                  {analysis.flags.filter(f => f.level === 'YELLOW').length > 0 && (
                    <Badge color="warning">{analysis.flags.filter(f => f.level === 'YELLOW').length} warning</Badge>
                  )}
                </div>
              </div>
              <div className="py-2">
                {analysis.flags.map((flag, i) => <FlagRow key={i} flag={flag} />)}
              </div>
            </Card>
          )}

          {/* ── Metric blocks ── */}
          <div className="grid grid-cols-2 gap-3">
            <MetricBlock title="Training Load">
              <MetricRow label="ACWR"            value={analysis.metrics.acwr ?? '—'} note={acwrLabel(analysis.metrics.acwr)} />
              <MetricRow label="Acute km/wk"     value={analysis.metrics.acute_km != null ? `${analysis.metrics.acute_km} km` : '—'} />
              <MetricRow label="Chronic avg"     value={analysis.metrics.chronic_km != null ? `${analysis.metrics.chronic_km?.toFixed(1)} km/wk` : '—'} />
              <MetricRow label="Mileage trend"   value={analysis.metrics.mileage_trend} />
              {analysis.metrics.vo2_latest && (
                <MetricRow label="VO2max" value={`${analysis.metrics.vo2_latest} ml/kg/min`} note={analysis.metrics.vo2_trend} />
              )}
            </MetricBlock>

            <MetricBlock title="Recovery">
              <MetricRow label="HRV last night"  value={analysis.metrics.hrv_last ? `${Math.round(analysis.metrics.hrv_last)} ms` : '—'} />
              <MetricRow label="HRV vs baseline" value={analysis.metrics.hrv_relative != null ? `${Math.round(analysis.metrics.hrv_relative * 100)}%` : '—'} note={analysis.metrics.hrv_status} />
              <MetricRow label="Resting HR"      value={analysis.metrics.hr_today ? `${analysis.metrics.hr_today} bpm` : '—'} />
              <MetricRow label="HR deviation"    value={analysis.metrics.hr_elevation != null ? `${analysis.metrics.hr_elevation > 0 ? '+' : ''}${analysis.metrics.hr_elevation} bpm` : '—'} />
              <MetricRow label="Body Battery"    value={analysis.metrics.bb_today_high != null ? `${analysis.metrics.bb_today_high}/100` : '—'} note={analysis.metrics.bb_trend} />
            </MetricBlock>

            <MetricBlock title="Sleep (7-day avg)">
              <MetricRow label="Duration"        value={fmtH(analysis.metrics.sleep_7avg_s)} />
              <MetricRow label="Score"           value={analysis.metrics.sleep_score_7avg != null ? `${analysis.metrics.sleep_score_7avg?.toFixed(0)}/100` : '—'} />
              <MetricRow label="Deep sleep"      value={analysis.metrics.deep_pct_7avg != null ? `${analysis.metrics.deep_pct_7avg?.toFixed(1)}%` : '—'} note="opt: 16–33%" />
              <MetricRow label="REM"             value={analysis.metrics.rem_pct_7avg != null ? `${analysis.metrics.rem_pct_7avg?.toFixed(1)}%` : '—'} note="opt: 21–31%" />
              <MetricRow label="Sleep debt (7d)" value={analysis.metrics.sleep_debt_7d_h != null ? `${analysis.metrics.sleep_debt_7d_h}h` : '—'} />
            </MetricBlock>

            <MetricBlock title="Pain (30 days)">
              {analysis.metrics.pain_7d?.length === 0 && analysis.metrics.chronic_pain_parts?.length === 0 ? (
                <div className="text-xs text-accent py-1">No pain entries</div>
              ) : (
                <>
                  <MetricRow label="Last 7 days"   value={`${analysis.metrics.pain_7d?.length ?? 0} entries`} />
                  <MetricRow label="Avg severity"  value={analysis.metrics.pain_severity_avg > 0 ? `${analysis.metrics.pain_severity_avg?.toFixed(1)}/5` : '—'} />
                  {analysis.metrics.chronic_pain_parts?.map(cp => (
                    <MetricRow key={cp.body_part} label={`Chronic: ${cp.body_part}`} value={`${cp.count}x, sev: ${cp.avg_severity}`} />
                  ))}
                </>
              )}
            </MetricBlock>
          </div>

          {/* ── Recent runs ── */}
          {analysis.metrics.recent_runs?.length > 0 && (
            <Card className="!p-0">
              <div className="px-4 py-3 border-b border-border">
                <span className={ST}>Recent Runs</span>
              </div>
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border">
                    {['Date','km','Pace','HR','TE'].map(h => (
                      <th key={h} className="px-3 py-1.5 text-left text-[10px] text-ink-3 font-semibold tracking-[0.1em] uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {analysis.metrics.recent_runs.slice(0, 7).map((r, i) => (
                    <tr key={i} className="border-b border-border last:border-b-0">
                      <td className="px-3 py-2 text-ink-2">{r.date}</td>
                      <td className="px-3 py-2 text-accent font-semibold">{r.km}</td>
                      <td className="px-3 py-2">{r.pace_s ? `${Math.floor(r.pace_s/60)}:${String(Math.round(r.pace_s%60)).padStart(2,'0')}` : '—'}</td>
                      <td className="px-3 py-2">{r.avg_hr ? `${r.avg_hr} bpm` : '—'}</td>
                      <td className="px-3 py-2">{r.aerobic_te ? r.aerobic_te.toFixed(1) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          {/* ── LLM Prompt builder ── */}
          <Card className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className={ST}>LLM Prompt — send to any AI</div>
                <div className="text-[11px] text-ink-3 mt-1">
                  Copy and paste into ChatGPT, Claude, Gemini, or any other AI chat.
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={copyPrompt} disabled={loadingPrompt}>
                  {copied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy Prompt</>}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { loadPrompt(); setPromptVisible(v => !v) }}>
                  {promptVisible ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  {promptVisible ? 'Hide' : 'Preview'}
                </Button>
              </div>
            </div>

            {loadingPrompt && <Spinner size={16} />}

            {promptVisible && prompt && (
              <pre className="bg-input border border-border rounded p-4 text-[11px] leading-[1.7] text-ink-2 max-h-[500px] overflow-y-auto whitespace-pre-wrap break-words mb-3">
                {prompt}
              </pre>
            )}

            <div className="flex items-start gap-2 text-[11px] text-ink-3 leading-relaxed mt-1">
              <Sparkles size={12} className="text-accent shrink-0 mt-0.5" />
              <span>
                The prompt includes all measured data, the algorithmic pre-analysis, and specific questions for the AI.
                If you have configured an AI provider in Settings, you can send it directly from the AI Chat page.
              </span>
            </div>
          </Card>

        </div>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScoreCard({ label, value, label2, invert }) {
  const color = invert
    ? (value >= 60 ? 'text-danger' : value >= 30 ? 'text-warn' : 'text-accent')
    : (value >= 75 ? 'text-accent' : value >= 50 ? 'text-warn' : 'text-danger')
  const barColor = invert
    ? (value >= 60 ? 'bg-danger' : value >= 30 ? 'bg-warn' : 'bg-accent')
    : (value >= 75 ? 'bg-accent' : value >= 50 ? 'bg-warn' : 'bg-danger')

  return (
    <div className="bg-card border border-border rounded p-4">
      <div className="text-[10px] font-semibold tracking-[0.1em] uppercase text-ink-3 mb-2">{label}</div>
      <div className={`text-[36px] font-extrabold tracking-[-0.03em] leading-none ${color}`}>{value}</div>
      <div className="h-1 bg-surface rounded-full mt-2 overflow-hidden">
        <div className={`h-full rounded-full transition-[width] duration-500 ${barColor}`} style={{ width: `${value}%` }} />
      </div>
      {label2 && <div className={`text-[10px] font-bold tracking-[0.06em] uppercase mt-1.5 ${color}`}>{label2}</div>}
    </div>
  )
}

function FlagRow({ flag }) {
  const [open, setOpen] = useState(false)
  const isRed = flag.level === 'RED'

  return (
    <div
      className={`border-b border-border last:border-b-0 ${flag.detail ? 'cursor-pointer' : ''}`}
      onClick={() => flag.detail && setOpen(v => !v)}
    >
      <div className="flex items-center gap-2.5 px-4 py-2.5">
        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isRed ? 'bg-danger' : 'bg-warn'}`} />
        <div className="flex-1">
          <div className="text-xs">{flag.message}</div>
          <div className="text-[10px] text-ink-3 mt-0.5">{flag.category}</div>
        </div>
        {flag.detail && (
          open ? <ChevronDown size={12} className="text-ink-3" />
               : <ChevronRight size={12} className="text-ink-3" />
        )}
      </div>
      {open && flag.detail && (
        <div className={`px-4 pb-3 pt-1 ml-8 text-xs text-ink-2 leading-relaxed ${isRed ? 'bg-danger/8' : 'bg-warn/10'}`}>
          {flag.detail}
        </div>
      )}
    </div>
  )
}

function MetricBlock({ title, children }) {
  return (
    <div className="bg-card border border-border rounded p-4">
      <div className="text-[10px] font-bold tracking-[0.12em] uppercase text-ink-3 mb-3">{title}</div>
      {children}
    </div>
  )
}

function MetricRow({ label, value, note }) {
  return (
    <div className="flex justify-between items-baseline py-1 border-b border-border last:border-b-0 text-xs">
      <span className="text-ink-2">{label}</span>
      <span className="font-semibold">
        {value}
        {note && <span className="text-[10px] text-ink-3 font-normal"> {note}</span>}
      </span>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function acwrLabel(acwr) {
  if (acwr == null) return null
  if (acwr > 1.5) return '🔴 HIGH RISK'
  if (acwr > 1.3) return '🟡 elevated'
  if (acwr >= 0.8) return '✓ optimal'
  if (acwr < 0.5) return '↓ low'
  return null
}

function fmtH(s) {
  if (!s) return '—'
  return `${Math.floor(s / 3600)}h ${Math.round((s % 3600) / 60)}m`
}
