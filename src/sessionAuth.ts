// Binds each client to a session via Supabase Anonymous Auth rather than
// just the bare session code. A fresh anonymous identity is minted on every
// session entry (create, join, or rejoin) — none is persisted/reused, per
// the decision to skip wiring up persistSession.
//
// The `session_code` passed here is stamped onto the new anonymous user's
// metadata at sign-in; a Custom Access Token Hook (see
// supabase/migrations/20260815170000_anon_auth_session_isolation.sql)
// copies it onto the minted JWT as a `session_code` claim, which RLS then
// checks on every request — REST and Realtime alike.

import { supabase } from './supabaseClient'

// Anonymous sign-in is a network round trip before anything else can
// happen, and on bad venue wifi it can hang far longer than a user will
// wait without feedback (verified: 30s+ under throttle with no error).
// Bound the whole create/join attempt so the caller always hears back —
// this races the real request, it doesn't cancel it, so a slow request
// that eventually resolves in the background is just ignored.
const ATTEMPT_TIMEOUT_MS = 15000

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | 'timeout'> {
  return Promise.race([
    promise,
    new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), ms)),
  ])
}

async function signInForSession(code: string) {
  const { data, error } = await supabase.auth.signInAnonymously({
    options: { data: { session_code: code } },
  })
  if (error || !data.session) return false
  // Belt-and-suspenders: make sure the realtime socket picks up the new
  // JWT immediately rather than waiting on the auth-state-change listener.
  await supabase.realtime.setAuth(data.session.access_token)
  return true
}

// Reported before each network step so the UI can show real progress
// instead of one static "Joining…"/"Starting…" for the whole attempt.
export type CreateProgress = 'signing-in' | 'creating'
export type JoinProgress = 'signing-in' | 'joining'

export type CreateResult = { ok: true } | { ok: false; reason: 'auth' | 'conflict' | 'other' | 'timeout' }

export async function createSession(
  code: string,
  teamNumber: string,
  onProgress?: (stage: CreateProgress) => void,
): Promise<CreateResult> {
  const attempt = async (): Promise<CreateResult> => {
    onProgress?.('signing-in')
    if (!(await signInForSession(code))) return { ok: false, reason: 'auth' }
    onProgress?.('creating')
    const { error } = await supabase.from('sessions').insert({ code, team_number: teamNumber })
    if (!error) return { ok: true }
    // 23505 = unique_violation on the code primary key — vanishingly rare
    // with a 4-char code, but let the caller retry with a fresh one.
    return { ok: false, reason: error.code === '23505' ? 'conflict' : 'other' }
  }
  const result = await withTimeout(attempt(), ATTEMPT_TIMEOUT_MS)
  return result === 'timeout' ? { ok: false, reason: 'timeout' } : result
}

export type JoinResult = { ok: true; team: string } | { ok: false; reason: 'auth' | 'not-found' | 'timeout' }

export async function joinSession(code: string, onProgress?: (stage: JoinProgress) => void): Promise<JoinResult> {
  const attempt = async (): Promise<JoinResult> => {
    onProgress?.('signing-in')
    if (!(await signInForSession(code))) return { ok: false, reason: 'auth' }
    onProgress?.('joining')
    const { data } = await supabase.from('sessions').select('team_number').eq('code', code).maybeSingle()
    if (!data) return { ok: false, reason: 'not-found' }
    return { ok: true, team: data.team_number }
  }
  const result = await withTimeout(attempt(), ATTEMPT_TIMEOUT_MS)
  return result === 'timeout' ? { ok: false, reason: 'timeout' } : result
}
