import { useState } from 'react'
import { Plus, Trash2, BookOpen } from 'lucide-react'
import TopBar from '../components/layout/TopBar.jsx'
import Button from '../components/ui/Button.jsx'
import Spinner from '../components/ui/Spinner.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import { useFetch } from '../hooks/useFetch.js'
import { api } from '../api/client.js'
import { formatDate, today } from '../utils/format.js'

const TAGS = ['pain', 'fatigue', 'great', 'injury', 'PR', 'easy', 'hard', 'rest']
const WELLBEING_EMOJI = ['', 'ðŸ˜ž', 'ðŸ˜•', 'ðŸ˜', 'ðŸ™‚', 'ðŸ˜„']

function useNotes() {
  return useFetch(() => api.getNotes({ limit: 100 }), [])
}

const LABEL_CLS = 'text-[10px] font-semibold tracking-[0.1em] uppercase text-ink-2'
const INPUT_CLS = 'bg-input border border-border rounded text-ink px-3 py-2 outline-none focus:border-accent transition-colors'

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
    <div className="p-7 max-w-[1280px]">
      <TopBar title="Journal">
        <Button size="sm" onClick={openNew}>
          <Plus size={13} /> New note
        </Button>
      </TopBar>

      <div className="grid grid-cols-[280px,1fr] gap-4 h-[calc(100vh-112px)]">
        {/* List */}
        <div className="border border-border rounded bg-card flex flex-col overflow-y-auto">
          {loading ? <Spinner /> : !notes?.length && !isNew ? (
            <EmptyState icon={BookOpen} title="No notes yet" description="Write your first journal entry." />
          ) : (
            (notes || []).map(note => (
              <div
                key={note.id}
                onClick={() => openNote(note)}
                className={[
                  'px-4 py-3.5 border-b border-border last:border-b-0 cursor-pointer transition-colors',
                  selected?.id === note.id
                    ? 'bg-accent/8 border-l-2 border-l-accent'
                    : 'hover:bg-hover',
                ].join(' ')}
              >
                <div className="text-[10px] font-semibold tracking-[0.08em] uppercase text-ink-3 mb-1">
                  {formatDate(note.date)}
                </div>
                <div className="text-xs text-ink-2 leading-relaxed">
                  {note.content.slice(0, 80)}{note.content.length > 80 ? '…' : ''}
                </div>
                {note.wellbeing_score && (
                  <div className="mt-1 text-sm">{WELLBEING_EMOJI[note.wellbeing_score]}</div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Editor */}
        <div className="border border-border rounded bg-card p-6 overflow-y-auto flex flex-col gap-4">
          {!form ? (
            <EmptyState icon={BookOpen} title="Select a note or create a new one" />
          ) : (
            <>
              <div className="flex flex-col gap-1.5 mb-0">
                <label className={LABEL_CLS}>Date</label>
                <input type="date" value={form.date} onChange={e => setField('date', e.target.value)}
                  className={INPUT_CLS} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={LABEL_CLS}>Wellbeing</label>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setField('wellbeing_score', form.wellbeing_score === n ? null : n)}
                      className={[
                        'text-[20px] bg-hover border rounded px-2.5 py-1 cursor-pointer transition-all duration-100',
                        form.wellbeing_score === n
                          ? 'opacity-100 border-accent bg-accent/8'
                          : 'opacity-50 border-border',
                      ].join(' ')}
                    >
                      {WELLBEING_EMOJI[n]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={LABEL_CLS}>Tags</label>
                <div className="flex flex-wrap gap-1.5">
                  {TAGS.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={[
                        'text-[10px] font-semibold tracking-[0.06em] uppercase rounded-sm px-2 py-[3px] cursor-pointer transition-all duration-100 border',
                        form.tags.includes(tag)
                          ? 'bg-accent/8 border-accent text-accent'
                          : 'bg-hover border-border text-ink-2',
                      ].join(' ')}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5 flex-1">
                <label className={LABEL_CLS}>Note</label>
                <textarea
                  value={form.content}
                  onChange={e => setField('content', e.target.value)}
                  placeholder="How did your run feel? Any pain? Observations..."
                  className={`${INPUT_CLS} min-h-[200px] resize-y leading-[1.7] text-[13px] flex-1`}
                />
              </div>

              <div className="flex gap-2 items-center">
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

