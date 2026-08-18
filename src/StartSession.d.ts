import type { FC } from 'react'
import type { Connection } from './Landing'

export interface StartSessionProps {
  connection?: Connection
  onBack?: () => void
  onSubmit?: (name: string) => void
  submitting?: boolean
  progress?: 'signing-in' | 'creating' | null
  error?: string | null
  framed?: boolean
}

declare const StartSession: FC<StartSessionProps>
export default StartSession
