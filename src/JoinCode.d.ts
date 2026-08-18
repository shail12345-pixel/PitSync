import type { FC } from 'react'
import type { Connection } from './Landing'

export interface JoinCodeProps {
  connection?: Connection
  onBack?: () => void
  onSubmit?: (code: string, name: string) => void
  submitting?: boolean
  progress?: 'signing-in' | 'joining' | null
  error?: string | null
  framed?: boolean
}

declare const JoinCode: FC<JoinCodeProps>
export default JoinCode
