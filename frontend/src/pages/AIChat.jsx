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
    <div className="page">
      <TopBar title="AI Elemzés">
        <Button variant="ghost" size="sm" onClick={refetch} disabled={loading}>
          <RefreshCw size={13} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
          Frissítés
        </Button>
      </TopBar>

      {loading ? <Spinner /> : !analysis ? (
        <div style={{ color: 'var(--text-3)', fontSize: 13 }}>Nincs elegendő adat az elemzéshez.</div>
      ) : (
        <div style={styles.layout}>
          {/* ── Scores row ── */}
          <div style={styles.scoreGrid}>
            <ScoreCard label="Felépülési készenlét" value={analysis.scores.recovery} label2={analysis.scores.recovery_label} />
            <ScoreCard label="Edzéskockázat" value={analysis.scores.training_risk} label2={analysis.scores.risk_label} invert />
            <ScoreCard label="Alváskvalitás" value={analysis.scores.sleep_quality} />
            <ScoreCard label="Forma index" value={analysis.scores.overall} />
          </div>

          {/* ── Flags ── */}
          {analysis.flags.length > 0 && (
            <Card padding="0" style={{ marginBottom: 16 }}>
              <div style={styles.sectionHeader}>
                <span style={styles.sectionTitle}>Azonosított jelek</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {analysis.flags.filter(f => f.level === 'RED').length > 0 && (
                    <Badge color="danger">{analysis.flags.filter(f => f.level === 'RED').length} kritikus</Badge>
                  )}
                  {analysis.flags.filter(f => f.level === 'YELLOW').length > 0 && (
                    <Badge color="warning">{analysis.flags.filter(f => f.level === 'YELLOW').length} figyelő</Badge>
                  )}
                </div>
              </div>
              <div style={{ padding: '8px 0' }}>
                {analysis.flags.map((flag, i) => (
                  <FlagRow key={i} flag={flag} />
                ))}
              </div>
            </Card>
          )}

          {/* ── Key metrics ── */}
          <div style={styles.metricsGrid}>
            <MetricBlock title="Edzésterhelés">
              <MetricRow label="ACWR" value={analysis.metrics.acwr ?? '—'} note={acwrLabel(analysis.metrics.acwr)} />
              <MetricRow label="Heti km (akut)" value={analysis.metrics.acute_km != null ? `${analysis.metrics.acute_km} km` : '—'} />
              <MetricRow label="Krónikus átlag" value={analysis.metrics.chronic_km != null ? `${analysis.metrics.chronic_km?.toFixed(1)} km/hét` : '—'} />
              <MetricRow label="Mileage trend" value={analysis.metrics.mileage_trend} />
              {analysis.metrics.vo2_latest && (
                <MetricRow label="VO2max" value={`${analysis.metrics.vo2_latest} ml/kg/min`} note={analysis.metrics.vo2_trend} />
              )}
            </MetricBlock>

            <MetricBlock title="Felépülés">
              <MetricRow label="HRV (utolsó éjjel)" value={analysis.metrics.hrv_last ? `${Math.round(analysis.metrics.hrv_last)} ms` : '—'} />
              <MetricRow label="HRV baseline %" value={analysis.metrics.hrv_relative != null ? `${Math.round(analysis.metrics.hrv_relative * 100)}%` : '—'} note={analysis.metrics.hrv_status} />
              <MetricRow label="Nyug. HR (mai)" value={analysis.metrics.hr_today ? `${analysis.metrics.hr_today} bpm` : '—'} />
              <MetricRow label="HR eltérés" value={analysis.metrics.hr_elevation != null ? `${analysis.metrics.hr_elevation > 0 ? '+' : ''}${analysis.metrics.hr_elevation} bpm` : '—'} />
              <MetricRow label="Body Battery csúcs" value={analysis.metrics.bb_today_high != null ? `${analysis.metrics.bb_today_high}/100` : '—'} note={analysis.metrics.bb_trend} />
            </MetricBlock>

            <MetricBlock title="Alvás (7 napos átlag)">
              <MetricRow label="Hossz" value={fmtH(analysis.metrics.sleep_7avg_s)} />
              <MetricRow label="Score" value={analysis.metrics.sleep_score_7avg != null ? `${analysis.metrics.sleep_score_7avg?.toFixed(0)}/100` : '—'} />
              <MetricRow label="Mély alvás" value={analysis.metrics.deep_pct_7avg != null ? `${analysis.metrics.deep_pct_7avg?.toFixed(1)}%` : '—'} note="opt: 16–33%" />
              <MetricRow label="REM" value={analysis.metrics.rem_pct_7avg != null ? `${analysis.metrics.rem_pct_7avg?.toFixed(1)}%` : '—'} note="opt: 21–31%" />
              <MetricRow label="Alvásdeficit (7d)" value={analysis.metrics.sleep_debt_7d_h != null ? `${analysis.metrics.sleep_debt_7d_h}h` : '—'} />
            </MetricBlock>

            <MetricBlock title="Fájdalom (30 nap)">
              {analysis.metrics.pain_7d?.length === 0 && analysis.metrics.chronic_pain_parts?.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--accent)', padding: '4px 0' }}>✓ Nincs fájdalom bejegyzés</div>
              ) : (
                <>
                  <MetricRow label="Elmúlt 7 nap" value={`${analysis.metrics.pain_7d?.length ?? 0} bejegyzés`} />
                  <MetricRow label="Átlag súlyosság" value={analysis.metrics.pain_severity_avg > 0 ? `${analysis.metrics.pain_severity_avg?.toFixed(1)}/5` : '—'} />
                  {analysis.metrics.chronic_pain_parts?.map(cp => (
                    <MetricRow key={cp.body_part} label={`Krónikus: ${cp.body_part}`} value={`${cp.count}x, súly: ${cp.avg_severity}`} />
                  ))}
                </>
              )}
            </MetricBlock>
          </div>

          {/* ── Recent runs ── */}
          {analysis.metrics.recent_runs?.length > 0 && (
            <Card padding="0" style={{ marginBottom: 16 }}>
              <div style={styles.sectionHeader}>
                <span style={styles.sectionTitle}>Utolsó futások</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Dátum','Km','Tempó','HR','TE'].map(h => (
                      <th key={h} style={{ padding: '6px 12px', textAlign: 'left', fontSize: 10, color: 'var(--text-3)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {analysis.metrics.recent_runs.slice(0, 7).map((r, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 12px', color: 'var(--text-2)' }}>{r.date}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--accent)', fontWeight: 600 }}>{r.km}</td>
                      <td style={{ padding: '8px 12px' }}>{r.pace_s ? `${Math.floor(r.pace_s/60)}:${String(Math.round(r.pace_s%60)).padStart(2,'0')}` : '—'}</td>
                      <td style={{ padding: '8px 12px' }}>{r.avg_hr ? `${r.avg_hr} bpm` : '—'}</td>
                      <td style={{ padding: '8px 12px' }}>{r.aerobic_te ? r.aerobic_te.toFixed(1) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          {/* ── Prompt builder ── */}
          <Card padding="20px">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <div style={styles.sectionTitle}>LLM Prompt — bármilyen AI-nak elküldhető</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>
                  Másolás után illeszd be a ChatGPT, Claude, Gemini, vagy bármely más AI chatbe.
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button size="sm" onClick={copyPrompt} disabled={loadingPrompt}>
                  {copied ? <><Check size={12} /> Másolva!</> : <><Copy size={12} /> Prompt másolása</>}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { loadPrompt(); setPromptVisible(v => !v) }}>
                  {promptVisible ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  {promptVisible ? 'Elrejtés' : 'Megtekintés'}
                </Button>
              </div>
            </div>

            {loadingPrompt && <Spinner size={16} />}

            {promptVisible && prompt && (
              <pre style={styles.promptBox}>{prompt}</pre>
            )}

            <div style={styles.aiHint}>
              <Sparkles size={12} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              <span>
                A prompt tartalmazza az összes mért adatot, az algoritmus előértékelését, és konkrét kérdéseket az AI számára.
                Ha konfiguráltad az AI provider-t a Beállításokban, az AI Chat oldalon közvetlenül is elküldheted.
              </span>
            </div>
          </Card>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScoreCard({ label, value, label2, invert }) {
  const color = invert
    ? (value >= 60 ? 'var(--danger)' : value >= 30 ? 'var(--warning)' : 'var(--accent)')
    : (value >= 75 ? 'var(--accent)' : value >= 50 ? 'var(--warning)' : 'var(--danger)')

  return (
    <div style={styles.scoreCard}>
      <div style={styles.scoreLabelTop}>{label}</div>
      <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.03em', color, lineHeight: 1 }}>{value}</div>
      <div style={styles.scoreBar}>
        <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.5s' }} />
      </div>
      {label2 && <div style={{ fontSize: 10, color, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 4 }}>{label2}</div>}
    </div>
  )
}

function FlagRow({ flag }) {
  const [open, setOpen] = useState(false)
  const color = flag.level === 'RED' ? 'var(--danger)' : 'var(--warning)'
  const bg    = flag.level === 'RED' ? 'var(--danger-10)' : 'var(--warning-10)'
  return (
    <div style={{ borderBottom: '1px solid var(--border)', cursor: flag.detail ? 'pointer' : 'default' }}
         onClick={() => flag.detail && setOpen(v => !v)}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px' }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12 }}>{flag.message}</div>
          <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 1 }}>{flag.category}</div>
        </div>
        {flag.detail && (
          open ? <ChevronDown size={12} style={{ color: 'var(--text-3)' }} />
               : <ChevronRight size={12} style={{ color: 'var(--text-3)' }} />
        )}
      </div>
      {open && flag.detail && (
        <div style={{ padding: '8px 16px 12px 32px', fontSize: 12, color: 'var(--text-2)', background: bg, lineHeight: 1.6 }}>
          {flag.detail}
        </div>
      )}
    </div>
  )
}

function MetricBlock({ title, children }) {
  return (
    <div style={styles.metricBlock}>
      <div style={styles.metricBlockTitle}>{title}</div>
      {children}
    </div>
  )
}

function MetricRow({ label, value, note }) {
  return (
    <div style={styles.metricRow}>
      <span style={styles.metricLabel}>{label}</span>
      <span style={styles.metricValue}>
        {value}
        {note && <span style={styles.metricNote}> {note}</span>}
      </span>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function acwrLabel(acwr) {
  if (acwr == null) return null;
  if (acwr > 1.5) return '🔴 MAGAS KOCKÁZAT';
  if (acwr > 1.3) return '🟡 emelt';
  if (acwr >= 0.8) return '✓ optimális';
  if (acwr < 0.5) return '↓ alacsony';
  return null;
}

function fmtH(s) {
  if (!s) return '—';
  return `${Math.floor(s / 3600)}h ${Math.round((s % 3600) / 60)}m`;
}

const styles = {
  layout: { display: 'flex', flexDirection: 'column', gap: 16 },
  scoreGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12,
  },
  scoreCard: {
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: '16px 18px',
  },
  scoreLabelTop: { fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 8 },
  scoreBar: { height: 4, background: 'var(--bg)', borderRadius: 2, marginTop: 8, overflow: 'hidden' },
  sectionHeader: { padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)' },
  metricsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  metricBlock: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px' },
  metricBlockTitle: { fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 12 },
  metricRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '4px 0', borderBottom: '1px solid var(--border)', fontSize: 12 },
  metricLabel: { color: 'var(--text-2)' },
  metricValue: { fontWeight: 600 },
  metricNote: { fontSize: 10, color: 'var(--text-3)', fontWeight: 400 },
  promptBox: {
    background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
    padding: '16px', fontSize: 11, lineHeight: 1.7, color: 'var(--text-2)',
    maxHeight: 500, overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginBottom: 12,
  },
  aiHint: {
    display: 'flex', alignItems: 'flex-start', gap: 8,
    fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6, marginTop: 4,
  },
}
