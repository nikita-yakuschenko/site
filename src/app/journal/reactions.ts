'use server'

import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { cookies } from 'next/headers'
import { getJournalPost } from './archive'

const voterCookie = 'avgst_journal_voter'
const dbPath = join(process.cwd(), '.local', 'journal-reactions.sqlite')

function openReactions() {
  const db = new DatabaseSync(dbPath)
  db.exec(`CREATE TABLE IF NOT EXISTS journal_likes (slug TEXT, voter TEXT, PRIMARY KEY (slug, voter));
    CREATE TABLE IF NOT EXISTS journal_shares (slug TEXT PRIMARY KEY, total INTEGER NOT NULL)`)
  return db
}

function counts(db: DatabaseSync, slug: string, voter?: string) {
  const likes = Number(db.prepare('SELECT count(*) AS total FROM journal_likes WHERE slug = ?').get(slug)?.total ?? 0)
  const shares = Number(db.prepare('SELECT total FROM journal_shares WHERE slug = ?').get(slug)?.total ?? 0)
  const liked = voter ? Boolean(db.prepare('SELECT 1 FROM journal_likes WHERE slug = ? AND voter = ?').get(slug, voter)) : false
  return { likes, shares, liked }
}

export async function getJournalReactionTotals(slugs: string[]) {
  const result: Record<string, { likes: number; shares: number }> = Object.create(null)
  if (process.env.NODE_ENV !== 'development' || !slugs.length) return result
  const db = openReactions()
  const wanted = new Set(slugs)
  try {
    for (const row of db.prepare('SELECT slug, count(*) AS likes FROM journal_likes GROUP BY slug').all()) {
      if (typeof row.slug === 'string' && wanted.has(row.slug)) result[row.slug] = { likes: Number(row.likes), shares: 0 }
    }
    for (const row of db.prepare('SELECT slug, total FROM journal_shares').all()) {
      if (typeof row.slug === 'string' && wanted.has(row.slug)) {
        const current = result[row.slug] ??= { likes: 0, shares: 0 }
        current.shares = Number(row.total)
      }
    }
    return result
  } finally { db.close() }
}

export async function getJournalReactions(slug: string) {
  if (process.env.NODE_ENV !== 'development' || !getJournalPost(slug)) return { likes: 0, shares: 0, liked: false }
  const jar = await cookies()
  const db = openReactions()
  try { return counts(db, slug, jar.get(voterCookie)?.value) } finally { db.close() }
}

export async function recordJournalReaction(slug: string, action: 'like' | 'unlike' | 'share') {
  if (process.env.NODE_ENV !== 'development' || typeof slug !== 'string' || !getJournalPost(slug)) return null
  if (!['like', 'unlike', 'share'].includes(action)) return null
  const jar = await cookies()
  let voter = jar.get(voterCookie)?.value
  if (!voter && action === 'like') {
    voter = randomUUID()
    jar.set(voterCookie, voter, { httpOnly: true, sameSite: 'lax', path: '/journal', maxAge: 31_536_000 })
  }
  const db = openReactions()
  try {
    if (action === 'like' && voter) db.prepare('INSERT OR IGNORE INTO journal_likes VALUES (?, ?)').run(slug, voter)
    if (action === 'unlike' && voter) db.prepare('DELETE FROM journal_likes WHERE slug = ? AND voter = ?').run(slug, voter)
    if (action === 'share') db.prepare('INSERT INTO journal_shares VALUES (?, 1) ON CONFLICT(slug) DO UPDATE SET total = total + 1').run(slug)
    return counts(db, slug, voter)
  } finally { db.close() }
}
