-- Real per-session isolation: Anonymous Auth + a custom JWT claim.
--
-- No Supabase CLI is linked in this repo, so run this by hand:
-- open the Supabase dashboard for this project -> SQL Editor -> paste and run.
-- Run this AFTER 20260815150000_lock_down_scout_notes_rls.sql (safe either
-- way — every statement here is idempotent).
--
-- After running this file, you still have to wire the function below up as
-- the active Custom Access Token Hook by hand in the dashboard — SQL alone
-- can't do that part. See the comment at the bottom for the exact steps.
--
-- Model: every client signs in anonymously (supabase.auth.signInAnonymously)
-- and stamps the session code it's about to use into that new anonymous
-- user's raw_user_meta_data. The hook function below reads it back out at
-- JWT-mint time and copies it onto the token as a `session_code` claim. RLS
-- then checks that claim against the row's session_code — for BOTH REST and
-- Realtime, since both authenticate off the same JWT (unlike a header-based
-- policy, which Realtime's postgres_changes can't see at all).
--
-- Decisions this migration intentionally does NOT enforce (by request):
--   - Any number of anonymous identities may claim the same session_code —
--     no join window, no per-session driver cap.
--   - No claim/session expiry — a session_code is valid indefinitely once a
--     sessions row exists for it.
--   - No cleanup of the anonymous auth.users rows this creates — deferred.

-- 1. sessions: binds a code to the team it's scouting. scout_notes.session_code
--    is logically a foreign key to this, not enforced (existing rows predate it).
create table if not exists public.sessions (
  code text primary key,
  team_number text not null,
  created_at timestamptz not null default now()
);

alter table public.sessions enable row level security;

drop policy if exists "sessions_select_own" on public.sessions;
drop policy if exists "sessions_insert_own" on public.sessions;

create policy "sessions_select_own"
  on public.sessions
  for select
  to authenticated
  using (code = (auth.jwt() ->> 'session_code'));

create policy "sessions_insert_own"
  on public.sessions
  for insert
  to authenticated
  with check (code = (auth.jwt() ->> 'session_code'));

-- No update/delete policy: denied by default once RLS is on, matching
-- scout_notes' least-privilege stance below.

-- 2. Custom Access Token Hook: copies the signed-in anonymous user's
--    session_code (set at sign-in via `options.data`) onto the JWT.
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims jsonb;
  code text;
begin
  select raw_user_meta_data ->> 'session_code'
    into code
    from auth.users
    where id = (event ->> 'user_id')::uuid;

  claims := event -> 'claims';

  if code is not null then
    claims := jsonb_set(claims, '{session_code}', to_jsonb(code));
  end if;

  return jsonb_set(event, '{claims}', claims);
end;
$$;

-- Required so the auth service (and only the auth service) can call this.
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;

-- 3. scout_notes: replace the open policies from the previous migration
--    with ones scoped to the caller's session_code claim. Bare `anon`
--    (no anonymous sign-in performed) now gets zero access — everyone has
--    to go through signInAnonymously first, closing the gap the previous
--    migration explicitly left open.
drop policy if exists "scout_notes_select_all" on public.scout_notes;
drop policy if exists "scout_notes_insert_all" on public.scout_notes;
drop policy if exists "scout_notes_select_own_session" on public.scout_notes;
drop policy if exists "scout_notes_insert_own_session" on public.scout_notes;

create policy "scout_notes_select_own_session"
  on public.scout_notes
  for select
  to authenticated
  using (session_code = (auth.jwt() ->> 'session_code'));

create policy "scout_notes_insert_own_session"
  on public.scout_notes
  for insert
  to authenticated
  with check (session_code = (auth.jwt() ->> 'session_code'));

-- Still deliberately no UPDATE/DELETE policy on scout_notes.

-- ---------------------------------------------------------------------------
-- Manual dashboard steps (SQL can't do either of these):
--
--   1. Enable Anonymous Sign-ins — off by default on every Supabase
--      project, and every client here depends on it:
--        Authentication -> Sign In / Providers -> Anonymous Sign-Ins -> Enable
--      (Confirmed missing live: signInAnonymously() 422s with
--      "anonymous_provider_disabled" until this is on.)
--
--   2. Register the hook function above as the active Custom Access Token
--      Hook:
--        Authentication -> Hooks -> Custom Access Token -> Enable / Add hook
--        Hook type: Postgres function
--        Schema: public   Function: custom_access_token_hook
--        Save.
--
-- Both take effect immediately — no redeploy needed, just the next
-- signInAnonymously() call.
-- ---------------------------------------------------------------------------
