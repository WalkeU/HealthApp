import { useState, useEffect } from 'react'
import { Plus, Trash2, BookOpen } from 'lucide-react'
import TopBar from '../components/layout/TopBar.jsx'
import Button from '../components/ui/Button.jsx'
import Spinner from '../components/ui/Spinner.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import Badge from '../components/ui/Badge.jsx'
import { useFetch } from '../hooks/useFetch.js'
import { api } from '../api/client.js'
import { formatDate, today } from '../utils/format.js'

const TAGS = ['pain', 'fatigue', 'great', 'injury', 'PR', 'easy', 'hard', 'rest']
const WELLBEING_EMOJI = ['', '😞', '😕', '😐', '🙂', '😄']

function useNotes() {
  return useFetch(() => api.getNotes({ limit: 100 }), [])
}

export default function Notes() {
  const { data: notes, loading, refetch } = useNotes()
  const [selected, setSelected] = useState(null)
  const [isNew, setIsNew] = useState(false)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  function openNew() {
    setIsNew(true)
    setSelected(null)
    setForm({ date: today(), content: '', tags: [], wellbeing_score: null })
  }

  function openNote(note) {
    setIsNew(false)
    setSelected(note)
    setForm({
      date: note.date,
      content: note.content,
      tags: note.tags ? note.tags.split(',').filter(Boolean) : [],
      wellbeing_score: note.wellbeing_score,
    })
  }

  function setField(k, v) {
    setForm(f => ({ ...f, [k]: v }))
  }

  function toggleTag(tag) {
    setForm(f => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag],
    }))
  }

  async function save() {
    if (!form?.content?.trim()) return
    setSaving(true)
    try {
      const payload = { ...form, tags: form.tags.join(',') || null }
      if (isNew) {
        await api.createNote(payload)
      } else {
        await api.updateNote(selected.id, payload)
      }
      await refetch()
      setIsNew(false)
      setSelected(null)
      setForm(null)
    } finally {
      setSaving(false)
    }
  }

  async function deleteNote() {
    if (!selected || !confirm('Delete this note?')) return
    setDeleting(true)
    try {
      await api.deleteNote(selected.id)
      await refetch()
      setSelected(null)
      setForm(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="page">
      <TopBar title="Journal">
        <Button size="sm" onClick={openNew}>
          <Plus size={13} /> New note
        </Button>
      </TopBar>

      <div className="split-layout">
        {/* List */}
        <div className="split-list">
          {loading ? <Spinner /> : !notes?.length && !isNew ? (
            <EmptyState icon={BookOpen} title="No notes yet" description="Write your first journal entry." />
          ) : (
            <>
              {(notes || []).map(note => (
                <div
                  key={note.id}
                  className={`list-item${selected?.id === note.id ? ' active' : ''}`}
                  onClick={() => openNote(note)}
                >
                  <div style={styles.noteDate}>{formatDate(note.date)}</div>
                  <div style={styles.notePreview}>
                    {note.content.slice(0, 80)}{note.content.length > 80 ? '…' : ''}
                  </div>
                  {note.wellbeing_score && (
                    <div style={styles.noteWell}>{WELLBEING_EMOJI[note.wellbeing_score]}</div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>

        {/* Editor */}
        <div className="split-panel">
          {!form ? (
            <EmptyState icon={BookOpen} title="Select a note or create a new one" />
          ) : (
            <>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input type="date" value={form.date} onChange={e => setField('date', e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Wellbeing</label>
                <div style={styles.wellbeingRow}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setField('wellbeing_score', form.wellbeing_score === n ? null : n)}
                      style={{
                        ...styles.wellBtn,
                        ...(form.wellbeing_score === n ? styles.wellBtnActive : {}),
                      }}
                    >
                      {WELLBEING_EMOJI[n]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Tags</label>
                <div style={styles.tags}>
                  {TAGS.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      style={{
                        ...styles.tagBtn,
                        ...(form.tags.includes(tag) ? styles.tagBtnActive : {}),
                      }}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Note</label>
                <textarea
                  value={form.content}
                  onChange={e => setField('content', e.target.value)}
                  placeholder="How did your run feel? Any pain? Observations..."
                  style={styles.textarea}
                />
              </div>

              <div style={styles.actions}>
                <Button onClick={save} disabled={saving || !form.content.trim()}>
                  {saving ? 'Saving…' : 'Save'}
                </Button>
                {!isNew && (
                  <Button variant="danger" onClick={deleteNote} disabled={deleting}>
                    <Trash2 size={13} />
                    {deleting ? '…' : 'Delete'}
                  </Button>
                )}
                <Button variant="ghost" onClick={() => { setSelected(null); setForm(null); setIsNew(false) }}>
                  Cancel
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const styles = {
  noteDate: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.08em',
    color: 'var(--text-3)',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  notePreview: {
    fontSize: 12,
    color: 'var(--text-2)',
    lineHeight: 1.5,
  },
  noteWell: {
    marginTop: 4,
    fontSize: 14,
  },
  wellbeingRow: {
    display: 'flex',
    gap: 6,
  },
  wellBtn: {
    fontSize: 20,
    background: 'var(--bg-hover)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '4px 10px',
    cursor: 'pointer',
    transition: 'all 0.1s',
    opacity: 0.5,
  },
  wellBtnActive: {
    opacity: 1,
    borderColor: 'var(--accent)',
    background: 'var(--accent-10)',
  },
  tags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagBtn: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    background: 'var(--bg-hover)',
    border: '1px solid var(--border)',
    borderRadius: 2,
    padding: '3px 8px',
    cursor: 'pointer',
    color: 'var(--text-2)',
    transition: 'all 0.1s',
  },
  tagBtnActive: {
    background: 'var(--accent-10)',
    borderColor: 'var(--accent)',
    color: 'var(--accent)',
  },
  textarea: {
    flex: 1,
    minHeight: 200,
    resize: 'vertical',
    lineHeight: 1.7,
    fontSize: 13,
  },
  actions: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },
}
