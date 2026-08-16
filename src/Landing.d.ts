import type { FC } from 'react'

export type Connection = 'good' | 'spotty' | 'offline'

export interface LandingProps {
  connection?: Connection
  onStart?: () => void
  onJoin?: () => void
  lastCode?: string | null
  onRejoin?: (code: string) => void
  framed?: boolean
}

declare const Landing: FC<LandingProps>
export default Landing
