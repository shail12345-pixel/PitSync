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

export type CreateResult = { ok: true } | { ok: false; reason: 'auth' | 'conflict' | 'other' }

export async function createSession(code: string, teamNumber: string): Promise<CreateResult> {
  if (!(await signInForSession(code))) return { ok: false, reason: 'auth' }
  const { error } = await supabase.from('sessions').insert({ code, team_number: teamNumber })
  if (!error) return { ok: true }
  // 23505 = unique_violation on the code primary key — vanishingly rare
  // with a 4-char code, but let the caller retry with a fresh one.
  return { ok: false, reason: error.code === '23505' ? 'conflict' : 'other' }
}

export type JoinResult = { ok: true; team: string } | { ok: false; reason: 'auth' | 'not-found' }

export async function joinSession(code: string): Promise<JoinResult> {
  if (!(await signInForSession(code))) return { ok: false, reason: 'auth' }
  const { data } = await supabase.from('sessions').select('team_number').eq('code', code).maybeSingle()
  if (!data) return { ok: false, reason: 'not-found' }
  return { ok: true, team: data.team_number }
}
