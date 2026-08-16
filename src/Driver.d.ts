import type { FC } from 'react'
import type { Connection } from './Landing'
import type { NoteCategory, PitSyncNote } from './Scout'

export interface DriverProps {
  team?: string
  sessionCode?: string
  notes?: PitSyncNote[]
  filter?: string
  onFilterChange?: (next: string) => void
  connection?: Connection
  syncedAt?: string
  largeText?: boolean
  categories?: NoteCategory[]
  onLeave?: () => void
  framed?: boolean
}

declare const Driver: FC<DriverProps>
export default Driver
