import { sql } from '@payloadcms/db-postgres'
import type { CollectionBeforeChangeHook } from 'payload'

type State = { code: string | null; _status: string | null; unpublished_at: string | null; like_count: number | null; share_count: number | null; view_count: number | null; like_voters: unknown; share_voters: unknown }
type DB = { execute: (query: ReturnType<typeof sql>) => Promise<{ rows: State[] }> }

// Versions contain editorial content, but live counters belong to the base row.
// Lock that row in the saving transaction so concurrent reactions aren't lost.
export const preserveProjectState: CollectionBeforeChangeHook = async ({ data, originalDoc, req, operation }) => {
  if (operation === 'create') {
    data.unpublishedAt = null
    return data
  }
  const adapter = req.payload.db as unknown as { drizzle: DB; sessions: Record<string, { db: DB }> }
  const transactionID = await req.transactionID
  const db = transactionID ? adapter.sessions[String(transactionID)].db : adapter.drizzle
  const result = await db.execute(sql`SELECT code, _status, unpublished_at, like_count, share_count, view_count, like_voters, share_voters FROM projects WHERE id = ${originalDoc.id} FOR UPDATE`)
  const row = result.rows[0]
  if (!row) throw new Error('Исходный проект не найден')
  data.code = row.code
  data.likeCount = Number(row.like_count) || 0
  data.shareCount = Number(row.share_count) || 0
  data.viewCount = Number(row.view_count) || 0
  data.likeVoters = row.like_voters ?? []
  data.shareVoters = row.share_voters ?? []
  data.unpublishedAt = data._status === 'published' ? null : data._status === 'draft' && row._status === 'published' ? new Date().toISOString() : row.unpublished_at
  return data
}
