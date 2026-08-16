import { useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'
import Landing from './Landing'
import TeamEntry from './TeamEntry'
import JoinCode from './JoinCode'
import Scout from './Scout'
import Driver from './Driver'
import TeamLookup from './TeamLookup'
import TeamNotes from './TeamNotes'
import { dbCategoryForId, rowToUiNote } from './noteMapping'
import type { NoteRow, UiNote } from './noteMapping'
import { dequeueNote, queueNote, queuedNotesForSession } from './offlineQueue'
import { readLastSession, writeLastSession } from './lastSession'
import type { LastSession } from './lastSession'
import { createSession, joinSession } from './sessionAuth'
import type { CreateProgress, JoinProgress } from './sessionAuth'

type View = 'landing' | 'team-entry' | 'join-code' | 'scout' | 'driver' | 'team-lookup' | 'team-notes'
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

// --- connection health thresholds -------------------------------------
// navigator.onLine only reflects local link state — a router with a dead
// uplink (captive portal, comp-hall wifi with no real internet behind it)
// reports `true` forever. Verified live: a fully blocked connection sat
// at onLine=true for 60s straight with the badge stuck on "live". So
// "good" is no longer "onLine is true" — it's "we've had real proof this
// channel is working recently", where proof is a postgres_changes
// payload, a presence sync, a successful subscribe, a successful note
// insert, or a dedicated round-trip probe. No proof within HEALTH_STALE_MS
// means the badge stops claiming "live", even if the browser insists
// it's online — a wrong "live" is worse than an honest "offline".
const HEALTH_FRESH_MS = 12000
const HEALTH_STALE_MS = 30000
const HEALTH_TICK_MS = 3000
const PROBE_INTERVAL_MS = 8000
const PROBE_TIMEOUT_MS = 6000
const SEND_TIMEOUT_MS = 8000

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
  const [connectionHealth, setConnectionHealth] = useState<ConnectionState>('good')
  const [startSubmitting, setStartSubmitting] = useState(false)
  const [startProgress, setStartProgress] = useState<CreateProgress | null>(null)
  const [startError, setStartError] = useState<string | null>(null)
  const [joinSubmitting, setJoinSubmitting] = useState(false)
  const [joinProgress, setJoinProgress] = useState<JoinProgress | null>(null)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [lookupTeam, setLookupTeam] = useState('')

  const lastActivityRef = useRef(Date.now())
  const flushingRef = useRef(false)

  const role: 'scout' | 'driver' = view === 'driver' ? 'driver' : 'scout'
  // A local link that's confirmed down always wins — that part of
  // navigator.onLine IS trustworthy. Above that floor, health is earned
  // by evidence, not assumed from the browser's say-so.
  const connection: ConnectionState = !online ? 'offline' : connectionHealth

  function recomputeHealth() {
    const age = Date.now() - lastActivityRef.current
    const next: ConnectionState = age < HEALTH_FRESH_MS ? 'good' : age < HEALTH_STALE_MS ? 'spotty' : 'offline'
    setConnectionHealth(next)
    return next
  }

  function recordActivity() {
    lastActivityRef.current = Date.now()
    if (recomputeHealth() === 'good') flushQueue()
  }

  // A dedicated, cheap round trip — proof the connection actually works,
  // not just that something happened to arrive. This is what catches a
  // channel that LOOKS subscribed but has gone quiet: nothing else would
  // notice (verified: 45-60s of silence with no realtime error callback).
  async function probeConnection() {
    if (!sessionCode) return
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS)
    try {
      const { error } = await supabase
        .from('sessions')
        .select('code', { head: true, count: 'exact' })
        .eq('code', sessionCode)
        .abortSignal(controller.signal)
      if (!error) recordActivity()
    } catch {
      // Network error or our own timeout abort — leave it to decay
      // naturally rather than guessing at a reason.
    } finally {
      clearTimeout(timer)
    }
  }

  // Flushes on real evidence the connection works (see recordActivity),
  // not only on the browser's 'online' event — a queued note behind a
  // dead-but-still-"online" uplink used to sit stuck indefinitely.
  async function flushQueue() {
    if (flushingRef.current || !sessionCode) return
    if (queuedNotesForSession(sessionCode).length === 0) return
    flushingRef.current = true
    try {
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
    } finally {
      flushingRef.current = false
    }
  }

  // network state — 'online' firing is also a good moment to actively
  // confirm the connection rather than just trusting the event.
  useEffect(() => {
    const goOnline = () => {
      setOnline(true)
      probeConnection()
    }
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionCode])

  // per-session data: initial fetch + realtime notes + presence (for driverCount)
  // + the health probe/decay timers, scoped to the same lifecycle.
  useEffect(() => {
    if (!sessionCode) return

    let cancelled = false
    lastActivityRef.current = Date.now()
    recomputeHealth()

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
          recordActivity()
        },
      )
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{ role: string }>()
        const drivers = Object.values(state)
          .flat()
          .filter((p) => p.role === 'driver')
        setDriverCount(drivers.length)
        recordActivity()
      })
      .subscribe(async (status) => {
        if (cancelled) return
        if (status === 'SUBSCRIBED') {
          recordActivity()
          if (role === 'driver') await channel.track({ role: 'driver' })
        }
        // TIMED_OUT/CHANNEL_ERROR/CLOSED deliberately not handled here —
        // verified a degraded-but-still-open connection often never fires
        // them at all. The badge is driven by whether data is actually
        // moving (recordActivity above); silence decays it on its own
        // via the tick timer below, regardless of what this callback says.
      })

    probeConnection()
    flushQueue()
    const probeTimer = setInterval(probeConnection, PROBE_INTERVAL_MS)
    const healthTimer = setInterval(recomputeHealth, HEALTH_TICK_MS)

    return () => {
      cancelled = true
      clearInterval(probeTimer)
      clearInterval(healthTimer)
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionCode, role])

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

  function handleStart() {
    setStartError(null)
    setView('team-entry')
  }

  function handleJoin() {
    setJoinError(null)
    setView('join-code')
  }

  function handleBackToLanding() {
    setStartError(null)
    setJoinError(null)
    setView('landing')
  }

  async function handleTeamSubmit(team: string) {
    setStartSubmitting(true)
    setStartError(null)
    setStartProgress(null)
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateCode()
      const result = await createSession(code, team, setStartProgress)
      if (result.ok) {
        enterSession(code, 'scout', team)
        setStartSubmitting(false)
        setStartProgress(null)
        return
      }
      if (result.reason !== 'conflict') {
        setStartError(
          result.reason === 'timeout'
            ? 'Taking too long — check your connection and try again.'
            : 'Could not start a session — check your connection and try again.',
        )
        setStartSubmitting(false)
        setStartProgress(null)
        return
      }
    }
    setStartError('Could not find an available session code — try again.')
    setStartSubmitting(false)
    setStartProgress(null)
  }

  async function handleCodeSubmit(code: string) {
    setJoinSubmitting(true)
    setJoinError(null)
    setJoinProgress(null)
    const result = await joinSession(code, setJoinProgress)
    if (!result.ok) {
      setJoinError(
        result.reason === 'not-found'
          ? `No session found for code ${code}.`
          : result.reason === 'timeout'
            ? 'Taking too long — check your connection and try again.'
            : 'Could not join — check your connection and try again.',
      )
      setJoinSubmitting(false)
      setJoinProgress(null)
      return
    }
    enterSession(code, 'driver', result.team)
    setJoinSubmitting(false)
    setJoinProgress(null)
  }

  async function handleRejoin(code: string) {
    const stored = lastSession?.code === code ? lastSession : null
    await attemptJoin(code, stored?.role === 'scout' ? 'scout' : 'driver', stored?.team ?? '')
  }

  function handleLookupTeam() {
    setView('team-lookup')
  }

  function handleTeamLookupSubmit(nextTeam: string) {
    setLookupTeam(nextTeam)
    setView('team-notes')
  }

  function handleBackToDriver() {
    setView('driver')
  }

  function handleLeave() {
    supabase.auth.signOut().catch(() => {})
    setSessionCode('')
    setTeam('')
    setMatch(1)
    setNotes([])
    setFilter('all')
    setDriverCount(0)
    setConnectionHealth('good')
    setView('landing')
  }

  async function handleSend(categoryId: string, text: string) {
    const dbCategory = dbCategoryForId(categoryId)
    const tempId = `local-${Date.now()}-${Math.random().toString(36).slice(2)}`
    // Same signal as the badge, not raw navigator.onLine — don't attempt
    // a real send (and wait out its timeout) when we already have no
    // recent proof the connection works.
    const looksOffline = !online || connectionHealth === 'offline'
    const optimistic: UiNote = {
      id: tempId,
      category: categoryId,
      text,
      meta: `Q${match}`,
      team,
      status: looksOffline ? 'queued' : 'sending',
      created_at: new Date().toISOString(),
    }
    setNotes((current) => [optimistic, ...current])

    if (looksOffline) {
      queueNote({ tempId, sessionCode, team, match, category: dbCategory, text })
      return
    }

    // Bounded so a truly dead uplink (no error, just silence) can't hang
    // this forever — falls through to the same queue path as a real error.
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS)
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
      .abortSignal(controller.signal)
      .single()
    clearTimeout(timer)

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
    recordActivity()
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

  if (view === 'team-entry') {
    return (
      <TeamEntry
        connection={online ? 'good' : 'offline'}
        onBack={handleBackToLanding}
        onSubmit={handleTeamSubmit}
        submitting={startSubmitting}
        progress={startProgress}
        error={startError}
      />
    )
  }

  if (view === 'join-code') {
    return (
      <JoinCode
        connection={online ? 'good' : 'offline'}
        onBack={handleBackToLanding}
        onSubmit={handleCodeSubmit}
        submitting={joinSubmitting}
        progress={joinProgress}
        error={joinError}
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
        onLeave={handleLeave}
      />
    )
  }

  if (view === 'team-lookup') {
    return (
      <TeamLookup
        connection={connection}
        onBack={handleBackToDriver}
        onSubmit={handleTeamLookupSubmit}
        notes={notes}
      />
    )
  }

  if (view === 'team-notes') {
    return <TeamNotes connection={connection} team={lookupTeam} notes={notes} onBack={handleBackToDriver} />
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
      onLeave={handleLeave}
      onLookupTeam={handleLookupTeam}
    />
  )
}

export default App
