import type { FC } from 'react'
import type { Connection } from './Landing'
import type { NoteCategory, PitSyncNote } from './Scout'

export interface TeamNotesProps {
  connection?: Connection
  team?: string
  notes?: PitSyncNote[]
  onBack?: () => void
  categories?: NoteCategory[]
  framed?: boolean
}

declare const TeamNotes: FC<TeamNotesProps>
export default TeamNotes
