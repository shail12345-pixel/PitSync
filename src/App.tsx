import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

type Note = {
  id: string
  team_number: string
  match_number: number | null
  content: string
  created_at: string
}

type View = 'home' | 'scout' | 'driver'

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

function App() {
  const [view, setView] = useState<View>('home')
  const [sessionCode, setSessionCode] = useState('')
  const [inputCode, setInputCode] = useState('')
  const [role, setRole] = useState<'scout' | 'driver' | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [teamNumber, setTeamNumber] = useState('')
  const [matchNumber, setMatchNumber] = useState('')
  const [content, setContent] = useState('')
  const [status, setStatus] = useState('')

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
    setRole('scout')
    setView('scout')
    setStatus('Session created: ' + code)
  }

  function joinSession() {
    if (!inputCode.trim()) return
    setSessionCode(inputCode.trim().toUpperCase())
    setRole('driver')
    setView('driver')
  }

  async function submitNote() {
    if (!content.trim() || !teamNumber.trim()) return
    await supabase.from('scout_notes').insert({
      session_code: sessionCode,
      team_number: teamNumber,
      match_number: matchNumber ? parseInt(matchNumber) : null,
      content,
    })
    setContent('')
    setStatus('Note sent')
  }

  if (view === 'home') {
    return (
      <div style={styles.container}>
        <h1 style={styles.title}>PitSync</h1>
        <p style={styles.subtitle}>Live team coordination for VEX</p>

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Scout</h2>
          <p style={styles.cardText}>Create a session and share the code with your team</p>
          <button style={styles.button} onClick={createSession}>
            Create Session
          </button>
        </div>

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Driver / Pit</h2>
          <p style={styles.cardText}>Enter your session code to see live scout notes</p>
          <input
            style={styles.input}
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value)}
            placeholder="Enter code (e.g. ABC123)"
          />
          <button style={styles.button} onClick={joinSession}>
            Join Session
          </button>
        </div>
      </div>
    )
  }

  if (view === 'scout') {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button style={styles.backButton} onClick={() => setView('home')}>← Back</button>
          <h1 style={styles.title}>Scout View</h1>
        </div>

        <div style={styles.sessionBadge}>
          Session: <strong>{sessionCode}</strong> — share this with your team
        </div>

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Add Scout Note</h2>
          <input
            style={styles.input}
            value={teamNumber}
            onChange={(e) => setTeamNumber(e.target.value)}
            placeholder="Team number (e.g. 4610T)"
          />
          <input
            style={styles.input}
            value={matchNumber}
            onChange={(e) => setMatchNumber(e.target.value)}
            placeholder="Match number (optional)"
            type="number"
          />
          <textarea
            style={styles.textarea}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What did you see? (auton, defense, driver skill...)"
          />
          <button style={styles.button} onClick={submitNote}>
            Send Note
          </button>
          {status && <p style={styles.status}>{status}</p>}
        </div>

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Notes Sent</h2>
          {notes.length === 0 && <p style={styles.cardText}>No notes yet</p>}
          {notes.map((note) => (
            <div key={note.id} style={styles.note}>
              <div style={styles.noteHeader}>
                <strong>Team {note.team_number}</strong>
                {note.match_number && <span> · Match {note.match_number}</span>}
              </div>
              <p style={styles.noteContent}>{note.content}</p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (view === 'driver') {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button style={styles.backButton} onClick={() => setView('home')}>← Back</button>
          <h1 style={styles.title}>Driver View</h1>
        </div>

        <div style={styles.sessionBadge}>
          Session: <strong>{sessionCode}</strong>
        </div>

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Live Scout Notes</h2>
          <p style={styles.cardText}>Updates appear automatically</p>
          {notes.length === 0 && <p style={styles.cardText}>Waiting for scout notes...</p>}
          {notes.map((note) => (
            <div key={note.id} style={styles.note}>
              <div style={styles.noteHeader}>
                <strong>Team {note.team_number}</strong>
                {note.match_number && <span> · Match {note.match_number}</span>}
              </div>
              <p style={styles.noteContent}>{note.content}</p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return null
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 480,
    margin: '0 auto',
    padding: '20px 16px',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    backgroundColor: '#0f0f0f',
    minHeight: '100vh',
    color: '#fff',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    margin: '0 0 4px 0',
    color: '#fff',
  },
  subtitle: {
    color: '#888',
    marginBottom: 24,
    fontSize: 15,
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: 600,
    margin: '0 0 8px 0',
  },
  cardText: {
    color: '#888',
    fontSize: 14,
    margin: '0 0 12px 0',
  },
  button: {
    backgroundColor: '#e63946',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '12px 20px',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    width: '100%',
    marginTop: 8,
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #333',
    backgroundColor: '#111',
    color: '#fff',
    fontSize: 15,
    marginBottom: 8,
    boxSizing: 'border-box' as const,
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #333',
    backgroundColor: '#111',
    color: '#fff',
    fontSize: 15,
    marginBottom: 8,
    minHeight: 80,
    boxSizing: 'border-box' as const,
    resize: 'vertical' as const,
  },
  sessionBadge: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: '10px 14px',
    marginBottom: 16,
    fontSize: 14,
    color: '#aaa',
  },
  backButton: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#e63946',
    fontSize: 15,
    cursor: 'pointer',
    padding: 0,
  },
  note: {
    borderTop: '1px solid #222',
    paddingTop: 12,
    marginTop: 12,
  },
  noteHeader: {
    fontSize: 14,
    color: '#e63946',
    marginBottom: 4,
  },
  noteContent: {
    fontSize: 15,
    color: '#fff',
    margin: 0,
  },
  status: {
    color: '#4caf50',
    fontSize: 13,
    marginTop: 8,
  },
}

export default App