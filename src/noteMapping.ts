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
  created_at: string
}

export type UiStatus = 'sending' | 'queued' | 'sent'

export type UiNote = {
  id: string
  category: string
  text: string
  meta: string
  team: string
  status?: UiStatus
  created_at: string
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
    status,
    created_at: row.created_at,
  }
}
