// Adapts between the `scout_notes` table shape and the shape the
// presentation components (Scout/Driver) expect. Keep this the only place
// that knows about both sides.

export type DbCategory = 'Auton' | 'Defense' | 'Scoring' | 'Drivetrain' | 'Other'

export type NoteRow = {
  id: string
  session_code: string
  team_number: string
  match_number: number | null
  category: DbCategory
  content: string
  author_name: string | null
  created_at: string
}

export type UiStatus = 'sending' | 'queued' | 'sent'

export type UiNote = {
  id: string
  category: string
  text: string
  meta: string
  team: string
  author: string
  status?: UiStatus
  created_at: string
}

// No accounts — author is whatever name was typed in at Start/Join, or
// blank. A blank byline reads as broken, not anonymous, so it falls back
// to a real label here rather than being displayed as-is.
export const DEFAULT_AUTHOR = 'Scout'

export function displayAuthor(name: string | null | undefined): string {
  const trimmed = name?.trim()
  return trimmed ? trimmed : DEFAULT_AUTHOR
}

// categories.js ids <-> scout_notes.category values (see supabase/migrations
// for the check constraint this must stay in sync with).
export const CATEGORY_DB_BY_ID: Record<string, DbCategory> = {
  auton: 'Auton',
  defense: 'Defense',
  scoring: 'Scoring',
  drive: 'Drivetrain',
  other: 'Other',
}

const CATEGORY_ID_BY_DB: Record<DbCategory, string> = {
  Auton: 'auton',
  Defense: 'defense',
  Scoring: 'scoring',
  Drivetrain: 'drive',
  Other: 'other',
}

export function dbCategoryForId(categoryId: string): DbCategory {
  return CATEGORY_DB_BY_ID[categoryId] ?? 'Other'
}

export function rowToUiNote(row: NoteRow, status: UiStatus = 'sent'): UiNote {
  return {
    id: row.id,
    category: CATEGORY_ID_BY_DB[row.category] ?? 'other',
    text: row.content,
    meta: row.match_number != null ? `Q${row.match_number}` : '',
    team: row.team_number,
    author: displayAuthor(row.author_name),
    status,
    created_at: row.created_at,
  }
}
