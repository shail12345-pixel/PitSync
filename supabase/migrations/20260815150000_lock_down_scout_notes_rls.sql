-- Lock down scout_notes: enable RLS and restrict anon/authenticated to
-- read + append only. No UPDATE or DELETE policy is defined for either
-- role, so both are implicitly denied once RLS is on.
--
-- No Supabase CLI is linked in this repo, so run this by hand:
-- open the Supabase dashboard for this project -> SQL Editor -> paste and run.
--
-- What this does NOT do: scope rows by session_code at the database layer.
-- The session code here is a bearer secret (like a meeting link), not a
-- login — there's no auth system for RLS to key off yet, and the anon key
-- itself is public (shipped in the client bundle). So this migration stops
-- short of real per-session row isolation; it only removes the ability for
-- any anon/authenticated request to tamper with or delete existing notes.
-- True per-session isolation (blocking an anon-key request with no code
-- from listing another session's notes) needs Anonymous Auth + a custom
-- JWT claim — scoped separately, not folded in here.

alter table public.scout_notes enable row level security;

drop policy if exists "scout_notes_select_all" on public.scout_notes;
drop policy if exists "scout_notes_insert_all" on public.scout_notes;

create policy "scout_notes_select_all"
  on public.scout_notes
  for select
  to anon, authenticated
  using (true);

create policy "scout_notes_insert_all"
  on public.scout_notes
  for insert
  to anon, authenticated
  with check (true);

-- Deliberately no UPDATE or DELETE policy: with RLS enabled and no policy
-- for those commands, anon/authenticated are denied by default. If you
-- later need edits (e.g. a "delete my mistaken note" affordance), add a
-- narrowly-scoped UPDATE/DELETE policy then rather than opening it wide.
