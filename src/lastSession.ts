// Remembers the most recent session so Landing can offer a one-tap rejoin.

export type LastSession = {
  code: string
  role: 'scout' | 'driver'
  team?: string
}

const KEY = 'pitsync:lastSession'

export function readLastSession(): LastSession | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as LastSession) : null
  } catch {
    return null
  }
}

export function writeLastSession(session: LastSession) {
  try {
    localStorage.setItem(KEY, JSON.stringify(session))
  } catch {
    // storage unavailable — rejoin just won't be offered next time
  }
}
