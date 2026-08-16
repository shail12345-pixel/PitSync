import type { FC } from 'react'
import type { Connection } from './Landing'
import type { PitSyncNote } from './Scout'

export interface TeamLookupProps {
  connection?: Connection
  onBack?: () => void
  onSubmit?: (team: string) => void
  notes?: PitSyncNote[]
  framed?: boolean
}

declare const TeamLookup: FC<TeamLookupProps>
export default TeamLookup
