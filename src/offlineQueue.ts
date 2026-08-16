// Notes composed while offline. Held in localStorage (survives a reload at
// the field) and flushed once the connection comes back.

import type { DbCategory } from './noteMapping'

export type PendingNote = {
  tempId: string
  sessionCode: string
  team: string
  match: number
  category: DbCategory
  text: string
}

const QUEUE_KEY = 'pitsync:pendingNotes'

function readQueue(): PendingNote[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    return raw ? (JSON.parse(raw) as PendingNote[]) : []
  } catch {
    return []
  }
}

function writeQueue(queue: PendingNote[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  } catch {
    // storage unavailable — queue just won't survive a reload
  }
}

export function queueNote(pending: PendingNote) {
  writeQueue([...readQueue(), pending])
}

export function dequeueNote(tempId: string) {
  writeQueue(readQueue().filter((p) => p.tempId !== tempId))
}

export function queuedNotesForSession(sessionCode: string): PendingNote[] {
  return readQueue().filter((p) => p.sessionCode === sessionCode)
}
