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
  status?: 'sending' | 'queued' | 'sent'
}

export interface ScoutProps {
  team?: string
  match?: number
  onMatchChange?: (next: number) => void
  sessionCode?: string
  driverCount?: number
  onCopyCode?: () => void
  notes?: PitSyncNote[]
  onSend?: (categoryId: string, text: string) => void
  connection?: Connection
  categories?: NoteCategory[]
  defaultCategory?: string
  onLeave?: () => void
  framed?: boolean
}

declare const Scout: FC<ScoutProps>
export default Scout
