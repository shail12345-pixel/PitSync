import { useState, useEffect } from 'react'
import type { CSSProperties } from 'react'
import { supabase } from './supabaseClient'
import './App.css'

const CATEGORIES = ['Auton', 'Defense', 'Scoring', 'Drivetrain', 'Other'] as const
type Category = (typeof CATEGORIES)[number]

const CATEGORY_STYLE: Record<Category, { color: string; muted: string }> = {
  Auton: { color: 'var(--cat-auton)', muted: 'var(--cat-auton-muted)' },
  Defense: { color: 'var(--cat-defense)', muted: 'var(--cat-defense-muted)' },
  Scoring: { color: 'var(--cat-scoring)', muted: 'var(--cat-scoring-muted)' },
  Drivetrain: { color: 'var(--cat-drivetrain)', muted: 'var(--cat-drivetrain-muted)' },
  Other: { color: 'var(--cat-other)', muted: 'var(--cat-other-muted)' },
}

function categoryVars(category: Category): CSSProperties {
  const style = CATEGORY_STYLE[category]
  return { '--chip-color': style.color, '--chip-muted': style.muted } as CSSProperties
}

type Note = {
  id: string
  team_number: string
  match_number: number | null
  category: Category
  content: string
  created_at: string
}

type View = 'home' | 'scout' | 'driver'

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

function formatRelativeTime(iso: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (seconds < 10) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ago`
}

const IconScout = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
    <path d="M9 3.5h6l1 3H8l1-3z" />
    <rect x="5" y="6.5" width="14" height="14.5" rx="2" />
    <path d="M9 12h6M9 16h4" />
  </svg>
)

const IconDriver = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
    <circle cx="12" cy="12" r="7.5" />
    <circle cx="12" cy="12" r="2.2" />
    <path d="M12 4.5v3.3M12 16.2v3.3M4.5 12h3.3M16.2 12h3.3" />
  </svg>
)

const IconBack = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <path d="M15 18l-6-6 6-6" />
  </svg>
)

const IconCopy = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
    <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
    <path d="M4.5 15.5V6a1.5 1.5 0 0 1 1.5-1.5h9.5" />
  </svg>
)

const IconCheck = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
    <path d="M5 12.5l4.5 4.5L19 7" />
  </svg>
)

function CategoryChips({
  selected,
  onToggle,
  label,
}: {
  selected: Category | null
  onToggle: (category: Category) => void
  label: string
}) {
  return (
    <div className="category-chips" role="group" aria-label={label}>
      {CATEGORIES.map((cat) => (
        <button
          key={cat}
          type="button"
          className={`category-chip${selected === cat ? ' category-chip--selected' : ''}`}
          style={categoryVars(cat)}
          aria-pressed={selected === cat}
          onClick={() => onToggle(cat)}
        >
          {cat}
        </button>
      ))}
    </div>
  )
}

function CategoryBadge({ category }: { category: Category }) {
  return (
    <span className="category-badge" style={categoryVars(category)}>
      {category}
    </span>
  )
}

function App() {
  const [view, setView] = useState<View>('home')
  const [sessionCode, setSessionCode] = useState('')
  const [inputCode, setInputCode] = useState('')

  const [notes, setNotes] = useState<Note[]>([])
  const [teamNumber, setTeamNumber] = useState('')
  const [matchNumber, setMatchNumber] = useState('')
  const [category, setCategory] = useState<Category | null>(null)
  const [content, setContent] = useState('')
  const [status, setStatus] = useState('')
  const [copied, setCopied] = useState(false)
  const [filterCategory, setFilterCategory] = useState<Category | null>(null)

  useEffect(() => {
    if (!sessionCode) return

    supabase
      .from('scout_notes')
      .select('*')
      .eq('session_code', sessionCode)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setNotes(data as Note[])
      })

    const channel = supabase
      .channel('notes-' + sessionCode)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'scout_notes' },
        (payload) => {
          setNotes((current) => [payload.new as Note, ...current])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionCode])

  function createSession() {
    const code = generateCode()
    setSessionCode(code)
    setView('scout')
    setStatus('')
  }

  function joinSession() {
    if (!inputCode.trim()) return
    setSessionCode(inputCode.trim().toUpperCase())
    setView('driver')
  }

  async function submitNote() {
    if (!content.trim() || !teamNumber.trim() || !category) return
    await supabase.from('scout_notes').insert({
      session_code: sessionCode,
      team_number: teamNumber,
      match_number: matchNumber ? parseInt(matchNumber) : null,
      category,
      content,
    })
    setContent('')
    setStatus('Note sent to drive team')
  }

  function copyCode() {
    navigator.clipboard.writeText(sessionCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  function renderHeader(role: 'SCOUT' | 'DRIVER') {
    return (
      <div className="topbar">
        <button className="topbar__back" onClick={() => setView('home')} aria-label="Back to home">
          {IconBack}
        </button>
        <div className="topbar__role">
          <span className={`role-dot role-dot--${role.toLowerCase()}`} />
          {role}
        </div>
        <button className="code-chip" onClick={copyCode} aria-label="Copy session code">
          <span className="code-chip__code">{sessionCode}</span>
          <span className="code-chip__icon">{copied ? IconCheck : IconCopy}</span>
        </button>
      </div>
    )
  }

  function renderNotes(emptyText: string, list: Note[]) {
    return (
      <div className="notes">
        {list.length === 0 ? (
          <div className="empty-state">{emptyText}</div>
        ) : (
          list.map((note) => (
            <article key={note.id} className="note-card">
              <div className="note-card__meta">
                <CategoryBadge category={note.category} />
                <span className="note-card__team">#{note.team_number}</span>
                {note.match_number != null && (
                  <span className="note-card__match">MATCH {note.match_number}</span>
                )}
                <span className="note-card__time">{formatRelativeTime(note.created_at)}</span>
              </div>
              <p className="note-card__content">{note.content}</p>
            </article>
          ))
        )}
      </div>
    )
  }

  const filteredNotes = filterCategory ? notes.filter((note) => note.category === filterCategory) : notes

  if (view === 'home') {
    return (
      <div className="app">
        <div className="shell">
          <div className="home">
            <div className="home__hero">
              <div className="home__eyebrow">VEX Robotics · Live Scouting</div>
              <h1 className="home__title">PitSync</h1>
              <p className="home__subtitle">
                Real-time scouting notes between the stands and the pit — no refresh, no relay runs.
              </p>
            </div>

            <div className="home__cards">
              <button type="button" className="action-card" onClick={createSession}>
                <span className="action-card__icon">{IconScout}</span>
                <span className="action-card__text">
                  <span className="action-card__title">Start Scouting</span>
                  <span className="action-card__desc">
                    Create a session and share the code with your drive team.
                  </span>
                </span>
                <span className="action-card__chevron">›</span>
              </button>

              <div className="action-card action-card--form">
                <span className="action-card__icon">{IconDriver}</span>
                <span className="action-card__text">
                  <span className="action-card__title">Join as Driver</span>
                  <span className="action-card__desc">Enter the session code from your scout.</span>
                  <div className="join-form">
                    <input
                      className="join-form__input"
                      value={inputCode}
                      onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === 'Enter' && joinSession()}
                      placeholder="ABC123"
                      maxLength={6}
                    />
                    <button className="btn btn--primary" onClick={joinSession} disabled={!inputCode.trim()}>
                      Join
                    </button>
                  </div>
                </span>
              </div>
            </div>

            <p className="home__footnote">No account needed — codes are session-only.</p>
          </div>
        </div>
      </div>
    )
  }

  if (view === 'scout') {
    return (
      <div className="app">
        <div className="shell">
          {renderHeader('SCOUT')}

          <section className="panel">
            <h2 className="panel__title">New Note</h2>
            <div className="field-row">
              <div className="field">
                <label className="field__label">Team</label>
                <input
                  className="field__input field__input--mono"
                  value={teamNumber}
                  onChange={(e) => setTeamNumber(e.target.value.toUpperCase())}
                  placeholder="4610T"
                />
              </div>
              <div className="field field--narrow">
                <label className="field__label">Match</label>
                <input
                  className="field__input field__input--mono"
                  value={matchNumber}
                  onChange={(e) => setMatchNumber(e.target.value)}
                  placeholder="—"
                  type="number"
                  inputMode="numeric"
                />
              </div>
            </div>
            <div className="field">
              <label className="field__label">Category</label>
              <CategoryChips selected={category} onToggle={setCategory} label="Note category" />
            </div>
            <div className="field">
              <label className="field__label">Observation</label>
              <textarea
                className="field__textarea"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Scored 2 in auton, strong defense, drivetrain looked slow on turns..."
              />
            </div>
            <button
              className="btn btn--primary btn--block"
              onClick={submitNote}
              disabled={!content.trim() || !teamNumber.trim() || !category}
            >
              Send to Drive Team
            </button>
            {status && (
              <p className="status-line">
                {IconCheck} {status}
              </p>
            )}
          </section>

          <section className="panel">
            <div className="panel__header">
              <h2 className="panel__title">Sent</h2>
              <span className="panel__count">{notes.length}</span>
            </div>
            {renderNotes('No notes sent yet — your first note will appear here.', notes)}
          </section>
        </div>
      </div>
    )
  }

  if (view === 'driver') {
    return (
      <div className="app">
        <div className="shell">
          {renderHeader('DRIVER')}

          <div className="live-strip">
            <span className="live-dot" />
            <span>Live</span>
            <span className="live-strip__sub">Updates arrive automatically</span>
          </div>

          <section className="panel">
            <div className="panel__header">
              <h2 className="panel__title">Filter</h2>
              {filterCategory && (
                <button className="panel__clear" onClick={() => setFilterCategory(null)}>
                  Clear
                </button>
              )}
            </div>
            <CategoryChips
              selected={filterCategory}
              onToggle={(cat) => setFilterCategory((current) => (current === cat ? null : cat))}
              label="Filter by category"
            />
          </section>

          <section className="panel">
            <div className="panel__header">
              <h2 className="panel__title">Scouting Feed</h2>
              <span className="panel__count">{filteredNotes.length}</span>
            </div>
            {renderNotes(
              filterCategory ? 'No notes in this category yet.' : 'Waiting for scout notes to come in...',
              filteredNotes
            )}
          </section>
        </div>
      </div>
    )
  }

  return null
}

export default App
