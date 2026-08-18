-- Add an optional display name to scout notes — not an account, just a
-- name typed in once at Start/Join, matching the existing "no accounts"
-- model. Null/blank means the sender didn't give one; the client falls
-- back to displaying "Scout" rather than storing a fabricated default.
--
-- No Supabase CLI is linked in this repo, so run this by hand:
-- open the Supabase dashboard for this project -> SQL Editor -> paste and run.

alter table public.scout_notes
  add column if not exists author_name text;

-- No changes to RLS or the realtime publication needed — this is an
-- ordinary nullable column on a table that already has insert/select
-- policies scoped to session_code, and postgres_changes sends new columns
-- on INSERT automatically (same reasoning as the category column added
-- in 20260815120000_add_category_to_scout_notes.sql).
