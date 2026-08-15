-- Add a category tag to scout notes.
--
-- No Supabase CLI is linked in this repo, so run this by hand:
-- open the Supabase dashboard for this project -> SQL Editor -> paste and run.
-- (If you ever link the CLI, `supabase db push` will pick this file up too.)

alter table public.scout_notes
  add column if not exists category text not null default 'Other';

alter table public.scout_notes
  add constraint scout_notes_category_check
  check (category in ('Auton', 'Defense', 'Scoring', 'Drivetrain', 'Other'));

-- Existing rows are backfilled to 'Other' by the column default above.
-- No changes to the realtime publication or replica identity are needed —
-- this app only listens for INSERT events, and postgres_changes sends the
-- full new row (including new columns) automatically.
