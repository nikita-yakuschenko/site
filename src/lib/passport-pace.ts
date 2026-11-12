const storageKey = 'avgst:passport-pace:v1'
const hour = 60 * 60 * 1000
const banFor = 3 * 60 * 60 * 1000

export type PassportPace = 'ok' | 'nudge' | 'banned'
export type PassportNotice = PassportPace | 'repeat' | 'page-banned'

type PaceState = { hits: number[]; banUntil: number; reason?: 'hour' | 'page' }

export function decidePassportPace(state: PaceState, now: number): { decision: PassportPace; state: PaceState } {
  if (state.banUntil > now) return { decision: 'banned', state }
  const hits = state.hits.filter(ts => now - ts < hour)
  if (hits.length >= 9) return { decision: 'banned', state: { hits, banUntil: now + banFor, reason: 'hour' } }
  if (hits.length >= 4) return { decision: 'nudge', state: { hits, banUntil: 0 } }
  return { decision: 'ok', state: { hits, banUntil: 0 } }
}

function readPace(): PaceState {
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey) || '')
    const hits = Array.isArray(raw?.hits) ? raw.hits.filter((ts: unknown) => typeof ts === 'number') : []
    return { hits, banUntil: typeof raw?.banUntil === 'number' ? raw.banUntil : 0, reason: raw?.reason === 'page' ? 'page' : 'hour' }
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

export function lockPassportDownload(reason: 'hour' | 'page' = 'hour') {
  const now = Date.now()
  const state = readPace()
  writePace({ hits: [], banUntil: Math.max(state.banUntil, now + banFor), reason: state.banUntil > now ? state.reason : reason })
}

export function passportBanNotice(): 'banned' | 'page-banned' {
  return readPace().reason === 'page' ? 'page-banned' : 'banned'
}

export function notifyPassportPace(kind: Exclude<PassportNotice, 'ok'>) {
  window.dispatchEvent(new CustomEvent('avgst:passport-pace', { detail: kind }))
}

const pageKey = (slug: string) => `avgst:passport-page:v1:${slug}`

export function nextPageAttempt(slug: string) {
  let attempts = 0
  let downloaded = false
  try {
    const raw = JSON.parse(sessionStorage.getItem(pageKey(slug)) || '')
    if (typeof raw?.attempts === 'number') attempts = raw.attempts
    downloaded = raw?.downloaded === true
  } catch { /* A blocked session storage still allows the first download. */ }
  attempts += 1
  try { sessionStorage.setItem(pageKey(slug), JSON.stringify({ attempts, downloaded })) } catch { /* Keep the count for this visit. */ }
  return { attempt: attempts, downloaded }
}

export function markPageDownloaded(slug: string) {
  let attempts = 1
  try {
    const raw = JSON.parse(sessionStorage.getItem(pageKey(slug)) || '')
    if (typeof raw?.attempts === 'number') attempts = raw.attempts
  } catch { /* The success flag is enough. */ }
  try { sessionStorage.setItem(pageKey(slug), JSON.stringify({ attempts, downloaded: true })) } catch { /* The open tab still knows about this success. */ }
}
