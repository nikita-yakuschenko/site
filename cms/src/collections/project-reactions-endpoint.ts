import { sql } from '@payloadcms/db-postgres'
import type { Endpoint, PayloadRequest } from 'payload'
import { authorizeSiteRequest } from './project-hero-endpoint'
import { legacyPreferenceRead, legacyPreferenceWrite } from '../optimization/likes-endpoints'
import type { PreferenceDatabase } from '../optimization/likes'

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

type Row = { like_count: string | number | null; share_count: string | number | null; view_count?: string | number | null; liked?: boolean | null }
type Adapter = { drizzle: { execute: (query: ReturnType<typeof sql>) => Promise<{ rows: Row[] }> } }

function countsOf(row: Row) {
  return { likes: Math.max(0, Number(row.like_count) || 0), shares: Math.max(0, Number(row.share_count) || 0) }
}

async function readCounts(req: PayloadRequest, slug: string, key: string) {
  const db = req.payload.db as unknown as Adapter
  const mark = JSON.stringify([key || 'none'])
  const result = await db.drizzle.execute(sql`
    SELECT "like_count", "share_count",
      COALESCE("like_voters", '[]'::jsonb) @> ${mark}::jsonb AS liked
    FROM "projects"
    WHERE "slug" = ${slug} OR "import_key" = ${`catalog:${slug}`}
    ORDER BY "id"
    LIMIT 1
  `)
  const row = result.rows[0]
  return row ? { ...countsOf(row), liked: Boolean(row.liked) } : null
}

export const projectReactionsEndpoint: Endpoint = {
  path: '/reactions',
  method: 'get',
  handler: async (req) => {
    const denied = authorizeSiteRequest(req)
    if (denied) return denied
    const url = new URL(req.url!)
    const slug = url.searchParams.get('slug') || ''
    const key = url.searchParams.get('key') || ''
    if (!slugPattern.test(slug)) return Response.json({ error: 'Некорректный адрес' }, { status: 400 })
    const canonical = await legacyPreferenceRead(req, slug, key)
    if (canonical) return canonical
    const counts = await readCounts(req, slug, /^c:[a-z0-9]{16,64}$/.test(key) ? key : '')
    if (!counts) return Response.json({ error: 'Проект не найден' }, { status: 404 })
    return Response.json(counts, { headers: { 'Cache-Control': 'no-store' } })
  },
}

export const projectReactionsWriteEndpoint: Endpoint = {
  path: '/reactions',
  method: 'post',
  handler: async (req) => {
    const denied = authorizeSiteRequest(req)
    if (denied) return denied
    let body: { slug?: unknown; action?: unknown; keys?: unknown; operation_id?: string; expected_revision?: number }
    try { body = await req.json!() } catch { return Response.json({ error: 'Некорректные данные' }, { status: 400 }) }
    const slug = typeof body.slug === 'string' ? body.slug : ''
    const action = body.action
    if (!slugPattern.test(slug) || (action !== 'like' && action !== 'unlike' && action !== 'share')) {
      return Response.json({ error: 'Некорректные данные' }, { status: 400 })
    }
    const db = req.payload.db as unknown as Adapter
    if (action === 'share') {
      const counts = await addShare(db, slug)
      if (!counts) return Response.json({ error: 'Проект не найден' }, { status: 404 })
      return Response.json(counts, { headers: { 'Cache-Control': 'no-store' } })
    }
    const keys = Array.isArray(body.keys) ? body.keys.filter((key): key is string => typeof key === 'string' && /^[acf]:[a-z0-9]{16,64}$/.test(key)).slice(0, 3) : []
    if (!keys.length) return Response.json({ error: 'Некорректные данные' }, { status: 400 })
    if (body.expected_revision !== undefined && (!Number.isSafeInteger(body.expected_revision) || body.expected_revision < 0)) return Response.json({ error: 'revision' }, { status: 400 })
    const canonical = await legacyPreferenceWrite(req, slug, action, keys, body.operation_id, body.expected_revision)
    if (canonical) return canonical
    // Baseline capture can start after the initial compatibility lookup. Lock
    // first, then recheck ownership in a fresh statement before any old write.
    const transactional = (req.payload.db as unknown as { drizzle: PreferenceDatabase }).drizzle
    const counts = await transactional.transaction(async tx => {
      const project = (await tx.execute(sql`SELECT id FROM projects WHERE slug=${slug} OR import_key=${`catalog:${slug}`} ORDER BY id LIMIT 1 FOR UPDATE`)).rows[0]
      if (!project) return null
      const owner = await tx.execute(sql`SELECT project_id FROM project_like_baselines WHERE project_id=${project.id}`)
      if (owner.rows.length) return 'canonical_owner' as const
      return changeCount({ drizzle: tx } as unknown as Adapter, slug, action === 'unlike' ? -1 : 1, keys)
    })
    if (counts === 'canonical_owner') return Response.json({ error: 'preferences_disabled' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
    if (!counts) return Response.json({ error: 'Проект не найден' }, { status: 404 })
    return Response.json(counts, { headers: { 'Cache-Control': 'no-store' } })
  },
}

export const projectViewsEndpoint: Endpoint = {
  path: '/views',
  method: 'post',
  handler: async (req) => {
    const denied = authorizeSiteRequest(req)
    if (denied) return denied
    let body: { slug?: unknown }
    try { body = await req.json!() } catch { return Response.json({ error: 'Некорректные данные' }, { status: 400 }) }
    const slug = typeof body.slug === 'string' ? body.slug : ''
    if (!slugPattern.test(slug)) return Response.json({ error: 'Некорректные данные' }, { status: 400 })
    const db = req.payload.db as unknown as Adapter
    const result = await db.drizzle.execute(sql`
      UPDATE "projects"
      SET "view_count" = COALESCE("view_count", 0) + 1
      WHERE "id" = (
        SELECT "id" FROM "projects"
        WHERE "slug" = ${slug} OR "import_key" = ${`catalog:${slug}`}
        ORDER BY "id" LIMIT 1
      )
      RETURNING "view_count"
    `)
    if (!result.rows[0]) return Response.json({ error: 'Проект не найден' }, { status: 404 })
    return Response.json({ views: Math.max(0, Number(result.rows[0].view_count) || 0) }, { headers: { 'Cache-Control': 'no-store' } })
  },
}

async function addShare(db: Adapter, slug: string) {
  const result = await db.drizzle.execute(sql`
    UPDATE "projects"
    SET "share_count" = COALESCE("share_count", 0) + 1
    WHERE "id" = (
      SELECT "id" FROM "projects"
      WHERE "slug" = ${slug} OR "import_key" = ${`catalog:${slug}`}
      ORDER BY "id" LIMIT 1
    )
    RETURNING "like_count", "share_count"
  `)
  return result.rows[0] ? countsOf(result.rows[0]) : null
}

async function changeCount(db: Adapter, slug: string, delta: 1 | -1, keys: string[]) {
  const present = keys.map((key) => sql`COALESCE("like_voters", '[]'::jsonb) @> ${JSON.stringify([key])}::jsonb`)
  const anyKey = sql.join(present, sql` OR `)
  const added = JSON.stringify(keys)
  const cleared = keys.reduce((query, key) => sql`${query} - ${key}`, sql`COALESCE("like_voters", '[]'::jsonb)`)
  const result = delta > 0
    ? await db.drizzle.execute(sql`
        UPDATE "projects"
        SET "like_count" = COALESCE("like_count", 0) + 1,
            "like_voters" = COALESCE("like_voters", '[]'::jsonb) || ${added}::jsonb
        WHERE "id" = (
          SELECT "id" FROM "projects"
          WHERE "slug" = ${slug} OR "import_key" = ${`catalog:${slug}`}
          ORDER BY "id" LIMIT 1
        )
        AND NOT (${anyKey})
        RETURNING "like_count", "share_count"
      `)
    : await db.drizzle.execute(sql`
        UPDATE "projects"
        SET "like_count" = GREATEST(COALESCE("like_count", 0) - 1, 0),
            "like_voters" = ${cleared}
        WHERE "id" = (
          SELECT "id" FROM "projects"
          WHERE "slug" = ${slug} OR "import_key" = ${`catalog:${slug}`}
          ORDER BY "id" LIMIT 1
        )
        AND (${anyKey})
        RETURNING "like_count", "share_count"
      `)
  if (result.rows[0]) return { ...countsOf(result.rows[0]), already: false }
  const current = await db.drizzle.execute(sql`
    SELECT "like_count", "share_count" FROM "projects"
    WHERE "slug" = ${slug} OR "import_key" = ${`catalog:${slug}`}
    ORDER BY "id" LIMIT 1
  `)
  return current.rows[0] ? { ...countsOf(current.rows[0]), already: true } : null
}
