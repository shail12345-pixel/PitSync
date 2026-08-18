import type { FC } from 'react'
import type { Connection } from './Landing'

export interface NoteCategory {
  id: string
  label: string
  color: string
}

export interface PitSyncNote {
  id: string
  category: string
  text: string
  meta?: string
  team?: string
  author?: string
  status?: 'sending' | 'queued' | 'sent'
  created_at?: string
}

export interface ScoutProps {
  match?: number
  onMatchChange?: (next: number) => void
  sessionCode?: string
  driverCount?: number
  onCopyCode?: () => void
  notes?: PitSyncNote[]
  onSend?: (categoryId: string, text: string, team: string) => void
  connection?: Connection
  categories?: NoteCategory[]
  defaultCategory?: string
  defaultTeam?: string
  onLeave?: () => void
  framed?: boolean
}

declare const Scout: FC<ScoutProps>
export default Scout
