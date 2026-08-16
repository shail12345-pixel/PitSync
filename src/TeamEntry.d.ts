import type { FC } from 'react'
import type { Connection } from './Landing'

export interface TeamEntryProps {
  connection?: Connection
  onBack?: () => void
  onSubmit?: (team: string) => void
  submitting?: boolean
  progress?: 'signing-in' | 'creating' | null
  error?: string | null
  framed?: boolean
}

declare const TeamEntry: FC<TeamEntryProps>
export default TeamEntry
