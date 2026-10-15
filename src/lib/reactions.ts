import { createHmac, randomBytes } from 'node:crypto'

export const VOTER_COOKIE = 'avgst_voter'
export const VOTER_MAX_AGE = 60 * 60 * 24 * 365

export type ReactionCounts = { likes: number; shares: number; liked: boolean }

const empty: ReactionCounts = { likes: 0, shares: 0, liked: false }

export type DeviceSignals = { tz?: string; screen?: string; lang?: string; cores?: number }

function clip(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

/** Отпечаток устройства без адреса сети: смена Wi-Fi не делает человека другим. */
export function deviceKey(request: Request, signals: DeviceSignals | undefined, secret: string) {
  const source = [
    (request.headers.get('user-agent') || '').slice(0, 180),
    clip(signals?.lang, 40) || (request.headers.get('accept-language') || '').slice(0, 40),
    clip(signals?.tz, 64),
    clip(signals?.screen, 32),
    Number.isInteger(signals?.cores) ? String(signals?.cores) : '',
  ].join('|')
  return `f:${createHmac('sha256', secret).update(source).digest('hex')}`
}

export function newVoterId() {
  return randomBytes(16).toString('hex')
}

export async function readProjectReactions(slug: string, voterId?: string): Promise<ReactionCounts> {
  const key = process.env.CMS_SITE_API_KEY
  if (!key) return empty
  try {
    const origin = process.env.CMS_PUBLIC_URL || (process.env.NODE_ENV === 'production' ? 'https://cms.avgst.ru' : 'http://localhost:3001')
    const query = new URLSearchParams({ slug })
    if (voterId) query.set('key', `c:${voterId}`)
    const response = await fetch(`${origin}/api/projects/reactions?${query}`, {
      headers: { Authorization: `Bearer ${key}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    })
    if (!response.ok) return empty
    const data = await response.json() as Partial<ReactionCounts>
    return {
      likes: Math.max(0, Number(data.likes) || 0),
      shares: Math.max(0, Number(data.shares) || 0),
      liked: Boolean(data.liked),
    }
  } catch {
    return empty
  }
}

export async function writeProjectReaction(slug: string, action: 'like' | 'unlike' | 'share', keys: string[]): Promise<ReactionCounts | null> {
  const key = process.env.CMS_SITE_API_KEY
  if (!key) return null
  const origin = process.env.CMS_PUBLIC_URL || (process.env.NODE_ENV === 'production' ? 'https://cms.avgst.ru' : 'http://localhost:3001')
  const response = await fetch(`${origin}/api/projects/reactions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, action, keys }),
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  })
  if (!response.ok) return null
  const data = await response.json() as Partial<ReactionCounts>
  return {
    likes: Math.max(0, Number(data.likes) || 0),
    shares: Math.max(0, Number(data.shares) || 0),
    liked: action === 'like' ? true : action === 'unlike' ? false : Boolean(data.liked),
  }
}
