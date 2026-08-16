import { useEffect, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'
import Landing from './Landing'
import Scout from './Scout'
import Driver from './Driver'
import { dbCategoryForId, rowToUiNote } from './noteMapping'
import type { NoteRow, UiNote } from './noteMapping'
import { dequeueNote, queueNote, queuedNotesForSession } from './offlineQueue'
import { readLastSession, writeLastSession } from './lastSession'
import type { LastSession } from './lastSession'
import { createSession, joinSession } from './sessionAuth'

type View = 'landing' | 'scout' | 'driver'
type ConnectionState = 'good' | 'spotty' | 'offline'

// Codes are typed by hand on someone else's phone — 4 chars, no 0/O/1/I.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
function generateCode() {
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  }
  return code
}

function formatClock(date: Date) {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function App() {
  const [view, setView] = useState<View>('landing')
  const [sessionCode, setSessionCode] = useState('')
  const [team, setTeam] = useState('')
  const [match, setMatch] = useState(1)
  const [notes, setNotes] = useState<UiNote[]>([])
  const [filter, setFilter] = useState('all')
  const [driverCount, setDriverCount] = useState(0)
  const [syncedAt, setSyncedAt] = useState('')
  const [lastSession, setLastSession] = useState<LastSession | null>(() => readLastSession())
  const [online, setOnline] = useState(() => navigator.onLine)
  const [channelStatus, setChannelStatus] = useState<'good' | 'spotty'>('good')

  const role: 'scout' | 'driver' = view === 'driver' ? 'driver' : 'scout'
  const connection: ConnectionState = !online ? 'offline' : channelStatus

  // network state
  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  // per-session data: initial fetch + realtime notes + presence (for driverCount)
  useEffect(() => {
    if (!sessionCode) return

    let cancelled = false

    supabase
      .from('scout_notes')
      .select('*')
      .eq('session_code', sessionCode)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled || error || !data) return
        const rows = data as NoteRow[]
        setNotes(rows.map((row) => rowToUiNote(row)))
        setSyncedAt(formatClock(new Date()))
        if (!team && rows.length > 0) setTeam(rows[0].team_number)
      })

    const channel: RealtimeChannel = supabase
      .channel(`session-${sessionCode}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'scout_notes', filter: `session_code=eq.${sessionCode}` },
        (payload) => {
          const row = payload.new as NoteRow
          setNotes((current) => {
            if (current.some((n) => n.id === row.id)) return current
            return [rowToUiNote(row), ...current]
          })
          setSyncedAt(formatClock(new Date()))
          setTeam((current) => current || row.team_number)
        },
      )
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{ role: string }>()
        const drivers = Object.values(state)
          .flat()
          .filter((p) => p.role === 'driver')
        setDriverCount(drivers.length)
      })
      .subscribe(async (status) => {
        if (cancelled) return
        if (status === 'SUBSCRIBED') {
          setChannelStatus('good')
          if (role === 'driver') await channel.track({ role: 'driver' })
        } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          setChannelStatus('spotty')
        }
      })

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionCode, role])

  // reconnect: flush anything queued while the connection was down
  useEffect(() => {
    if (!online || !sessionCode) return
    ;(async () => {
      for (const pending of queuedNotesForSession(sessionCode)) {
        const { data, error } = await supabase
          .from('scout_notes')
          .insert({
            session_code: pending.sessionCode,
            team_number: pending.team,
            match_number: pending.match,
            category: pending.category,
            content: pending.text,
          })
          .select()
          .single()
        if (error || !data) continue
        dequeueNote(pending.tempId)
        const row = data as NoteRow
        setNotes((current) => {
          const withoutTemp = current.filter((n) => n.id !== pending.tempId)
          if (withoutTemp.some((n) => n.id === row.id)) return withoutTemp
          return [rowToUiNote(row), ...withoutTemp]
        })
        setSyncedAt(formatClock(new Date()))
      }
    })()
  }, [online, sessionCode])

  function enterSession(code: string, nextView: 'scout' | 'driver', nextTeam: string) {
    setTeam(nextTeam)
    setMatch(1)
    setNotes([])
    setFilter('all')
    setDriverCount(0)
    setSessionCode(code)
    setView(nextView)
    const session: LastSession = { code, role: nextView === 'scout' ? 'scout' : 'driver', team: nextTeam || undefined }
    writeLastSession(session)
    setLastSession(session)
  }

  async function attemptJoin(code: string, nextView: 'scout' | 'driver', fallbackTeam: string) {
    const result = await joinSession(code)
    if (!result.ok) {
      window.alert(
        result.reason === 'not-found'
          ? `No session found for code ${code}.`
          : 'Could not join — check your connection and try again.',
      )
      return
    }
    enterSession(code, nextView, result.team || fallbackTeam)
  }

  async function handleStart() {
    const teamInput = window.prompt('Which team are you scouting? (e.g. 1234A)')
    if (!teamInput || !teamInput.trim()) return
    const team = teamInput.trim().toUpperCase()

    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateCode()
      const result = await createSession(code, team)
      if (result.ok) {
        enterSession(code, 'scout', team)
        return
      }
      if (result.reason !== 'conflict') {
        window.alert('Could not start a session — check your connection and try again.')
        return
      }
    }
    window.alert('Could not find an available session code — try again.')
  }

  async function handleJoin() {
    const codeInput = window.prompt('Enter the 4-character session code')
    if (!codeInput || !codeInput.trim()) return
    await attemptJoin(codeInput.trim().toUpperCase(), 'driver', '')
  }

  async function handleRejoin(code: string) {
    const stored = lastSession?.code === code ? lastSession : null
    await attemptJoin(code, stored?.role === 'scout' ? 'scout' : 'driver', stored?.team ?? '')
  }

  async function handleSend(categoryId: string, text: string) {
    const dbCategory = dbCategoryForId(categoryId)
    const tempId = `local-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const optimistic: UiNote = {
      id: tempId,
      category: categoryId,
      text,
      meta: `Q${match}`,
      status: online ? 'sending' : 'queued',
      created_at: new Date().toISOString(),
    }
    setNotes((current) => [optimistic, ...current])

    if (!online) {
      queueNote({ tempId, sessionCode, team, match, category: dbCategory, text })
      return
    }

    const { data, error } = await supabase
      .from('scout_notes')
      .insert({
        session_code: sessionCode,
        team_number: team,
        match_number: match,
        category: dbCategory,
        content: text,
      })
      .select()
      .single()

    if (error || !data) {
      queueNote({ tempId, sessionCode, team, match, category: dbCategory, text })
      setNotes((current) => current.map((n) => (n.id === tempId ? { ...n, status: 'queued' } : n)))
      return
    }

    const row = data as NoteRow
    setNotes((current) => {
      const withoutTemp = current.filter((n) => n.id !== tempId)
      if (withoutTemp.some((n) => n.id === row.id)) return withoutTemp
      return [rowToUiNote(row), ...withoutTemp]
    })
    setSyncedAt(formatClock(new Date()))
  }

  if (view === 'landing') {
    return (
      <Landing
        connection={online ? 'good' : 'offline'}
        onStart={handleStart}
        onJoin={handleJoin}
        lastCode={lastSession?.code ?? null}
        onRejoin={handleRejoin}
      />
    )
  }

  if (view === 'scout') {
    return (
      <Scout
        team={team}
        match={match}
        onMatchChange={setMatch}
        sessionCode={sessionCode}
        driverCount={driverCount}
        onCopyCode={() => navigator.clipboard.writeText(sessionCode)}
        notes={notes}
        onSend={handleSend}
        connection={connection}
      />
    )
  }

  return (
    <Driver
      team={team}
      sessionCode={sessionCode}
      notes={notes}
      filter={filter}
      onFilterChange={setFilter}
      connection={connection}
      syncedAt={syncedAt}
    />
  )
}

export default App
