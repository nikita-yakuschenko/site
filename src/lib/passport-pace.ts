const storageKey = 'avgst:passport-pace:v1'
const tenMinutes = 10 * 60 * 1000
const hour = 60 * 60 * 1000
const banFor = 3 * 60 * 60 * 1000

export type PassportPace = 'ok' | 'nudge' | 'banned'

type PaceState = { hits: number[]; banUntil: number }

export function decidePassportPace(state: PaceState, now: number): { decision: PassportPace; state: PaceState } {
  if (state.banUntil > now) return { decision: 'banned', state }
  const hits = state.hits.filter(ts => now - ts < hour)
  if (hits.length >= 10) return { decision: 'banned', state: { hits: [], banUntil: now + banFor } }
  return { decision: hits.filter(ts => now - ts < tenMinutes).length >= 5 ? 'nudge' : 'ok', state: { hits, banUntil: 0 } }
}

function readPace(): PaceState {
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey) || '')
    const hits = Array.isArray(raw?.hits) ? raw.hits.filter((ts: unknown) => typeof ts === 'number') : []
    return { hits, banUntil: typeof raw?.banUntil === 'number' ? raw.banUntil : 0 }
  } catch { return { hits: [], banUntil: 0 } }
}

function writePace(state: PaceState) {
  try { localStorage.setItem(storageKey, JSON.stringify(state)) } catch { /* The current visit still shows the plaque. */ }
}

export function passportPaceDecision(): PassportPace {
  const next = decidePassportPace(readPace(), Date.now())
  if (next.decision === 'banned') writePace(next.state)
  return next.decision
}

export function rememberPassportDownload() {
  const now = Date.now()
  const state = readPace()
  if (state.banUntil > now) return
  writePace({ hits: [...state.hits.filter(ts => now - ts < hour), now], banUntil: 0 })
}

export function lockPassportDownload() {
  const now = Date.now()
  const state = readPace()
  writePace({ hits: [], banUntil: Math.max(state.banUntil, now + banFor) })
}

export function notifyPassportPace(kind: Exclude<PassportPace, 'ok'>) {
  window.dispatchEvent(new CustomEvent('avgst:passport-pace', { detail: kind }))
}
