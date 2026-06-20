import { useState, useRef, useEffect } from 'react'
import { Bot, Send, Sparkles, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../components/layout/TopBar.jsx'
import Button from '../components/ui/Button.jsx'
import Spinner from '../components/ui/Spinner.jsx'
import { useFetch } from '../hooks/useFetch.js'
import { api } from '../api/client.js'

function useAiStatus() {
  return useFetch(() => api.getAiStatus(), [])
}

export default function AIChat() {
  const navigate = useNavigate()
  const { data: status, loading } = useAiStatus()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setSending(true)
    try {
      const reply = await api.aiChat([...messages, { role: 'user', content: text }])
      setMessages(prev => [...prev, { role: 'assistant', content: reply.content || reply.error || 'No response' }])
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${e.message}`, error: true }])
    } finally {
      setSending(false)
    }
  }

  if (loading) return <div className="page"><TopBar title="AI Coach" /><Spinner /></div>

  const enabled = status?.enabled

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 56px)', gap: 0, padding: '28px 32px 0' }}>
      <TopBar title="AI Coach">
        {!enabled && (
          <Button variant="ghost" size="sm" onClick={() => navigate('/settings')}>
            <Settings size={13} /> Configure
          </Button>
        )}
      </TopBar>

      {!enabled ? (
        <div style={styles.placeholder}>
          <div style={styles.placeholderIcon}>
            <Bot size={32} style={{ color: 'var(--text-3)' }} />
          </div>
          <div style={styles.placeholderTitle}>AI Integration — Phase 2</div>
          <div style={styles.placeholderDesc}>
            The AI coach isn't configured yet. Once enabled, you can ask questions like:
          </div>
          <div style={styles.exampleGrid}>
            {EXAMPLES.map((ex, i) => (
              <div key={i} style={styles.example}>
                <Sparkles size={11} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 1 }} />
                <span>{ex}</span>
              </div>
            ))}
          </div>
          <div style={styles.providerRow}>
            <span style={styles.providerLabel}>Supported providers:</span>
            {['Claude (Anthropic)', 'OpenAI', 'Ollama (local)'].map(p => (
              <span key={p} style={styles.provider}>{p}</span>
            ))}
          </div>
          <Button onClick={() => navigate('/settings')} style={{ marginTop: 24 }}>
            <Settings size={13} /> Open Settings
          </Button>
        </div>
      ) : (
        <>
          {/* Messages */}
          <div style={styles.messages}>
            {messages.length === 0 && (
              <div style={styles.chatWelcome}>
                <Bot size={20} style={{ color: 'var(--accent)' }} />
                <span>Ask me about your training, recovery, or health trends.</span>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} style={{ ...styles.msg, ...(msg.role === 'user' ? styles.msgUser : styles.msgAi), ...(msg.error ? { color: 'var(--danger)' } : {}) }}>
                {msg.role === 'assistant' && <Bot size={14} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />}
                <div>{msg.content}</div>
              </div>
            ))}
            {sending && (
              <div style={{ ...styles.msg, ...styles.msgAi }}>
                <Bot size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                <div style={styles.typing}><span /><span /><span /></div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={styles.inputRow}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
              placeholder="Ask about your training…"
              style={styles.chatInput}
              disabled={sending}
            />
            <Button onClick={send} disabled={sending || !input.trim()}>
              <Send size={13} />
            </Button>
          </div>
        </>
      )}

      <style>{`
        @keyframes typing { 0%, 80%, 100% { opacity: 0 } 40% { opacity: 1 } }
      `}</style>
    </div>
  )
}

const EXAMPLES = [
  '"Why am I tired this week?"',
  '"Am I overtraining?"',
  '"What does my HRV trend say about my recovery?"',
  '"Suggest a training plan for next week."',
  '"Is my left knee pain getting worse?"',
  '"How does my sleep affect my run pace?"',
]

const styles = {
  placeholder: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 24px',
    textAlign: 'center',
    gap: 16,
  },
  placeholderIcon: {
    width: 72,
    height: 72,
    borderRadius: '50%',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: '-0.02em',
  },
  placeholderDesc: {
    fontSize: 13,
    color: 'var(--text-2)',
    maxWidth: 420,
    lineHeight: 1.7,
  },
  exampleGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: 8,
    maxWidth: 560,
    width: '100%',
    marginTop: 4,
  },
  example: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '10px 12px',
    fontSize: 12,
    color: 'var(--text-2)',
    textAlign: 'left',
  },
  providerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 8,
  },
  providerLabel: {
    fontSize: 11,
    color: 'var(--text-3)',
  },
  provider: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.06em',
    padding: '2px 8px',
    borderRadius: 2,
    background: 'var(--accent-10)',
    color: 'var(--accent)',
    border: '1px solid var(--accent-20)',
  },
  messages: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    paddingBottom: 16,
  },
  chatWelcome: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13,
    color: 'var(--text-2)',
    padding: '16px 0',
  },
  msg: {
    display: 'flex',
    gap: 10,
    maxWidth: 680,
    fontSize: 13,
    lineHeight: 1.7,
  },
  msgUser: {
    alignSelf: 'flex-end',
    background: 'var(--accent-10)',
    border: '1px solid var(--accent-20)',
    borderRadius: 'var(--radius)',
    padding: '10px 14px',
    color: 'var(--text)',
  },
  msgAi: {
    alignSelf: 'flex-start',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '10px 14px',
  },
  typing: {
    display: 'flex',
    gap: 4,
    alignItems: 'center',
    height: 20,
  },
  inputRow: {
    display: 'flex',
    gap: 8,
    padding: '16px 0 28px',
    borderTop: '1px solid var(--border)',
    marginTop: 'auto',
  },
  chatInput: {
    flex: 1,
  },
}
