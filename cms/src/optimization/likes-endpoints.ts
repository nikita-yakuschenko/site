import { randomUUID } from 'node:crypto'
import { sql } from '@payloadcms/db-postgres'
import type { Endpoint, PayloadRequest } from 'payload'
import { authorizeSiteRequest } from '../collections/project-hero-endpoint'
import { optimizationFlags } from './flags'
import { preferenceIdentity, readPreferences, setPreference, type PreferenceDatabase } from './likes'
import { syncLegacyLikes } from './legacy-likes'
import { fingerprintKeyPattern, operationIdPattern, parsePreferenceCodes, parsePreferenceSync, parseSetPreference, voterKeyPattern } from '../../../src/lib/optimization/preferences-contracts'
import { isRecordId } from '../../../src/lib/record-id'

const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })
export const preferenceDatabase = (req: PayloadRequest) => (req.payload.db as unknown as { drizzle: PreferenceDatabase }).drizzle

function endpoint(path: string, handle: (req: PayloadRequest, input: Record<string, unknown>) => Promise<Response>): Endpoint {
  return { path, method: 'post', handler: async req => {
    const denied = authorizeSiteRequest(req)
    if (denied) return denied
    if (!optimizationFlags().preferences) return reply({ error: 'preferences_disabled' }, 503)
    if (Number(req.headers.get('content-length') ?? 0) > 32_768) return reply({ error: 'body_size' }, 413)
    let input: unknown
    try { input = await req.json!() } catch { return reply({ error: 'bad_json' }, 400) }
    if (!input || typeof input !== 'object' || Array.isArray(input) || Buffer.byteLength(JSON.stringify(input), 'utf8') > 32_768) return reply({ error: 'invalid_input' }, 400)
    try { return await handle(req, input as Record<string, unknown>) } catch { return reply({ error: 'preferences_unavailable' }, 503) }
  } }
}

function identity(input: Record<string, unknown>) {
  if (typeof input.voter_key !== 'string' || !voterKeyPattern.test(input.voter_key) || (input.region !== 'nn' && input.region !== 'msk') || typeof input.analytics_allowed !== 'boolean') return null
  if (input.fingerprint_key !== undefined && (typeof input.fingerprint_key !== 'string' || !fingerprintKeyPattern.test(input.fingerprint_key))) return null
  return preferenceIdentity(input.voter_key, process.env.OPTIMIZATION_PREFERENCES_SECRET || '', { region: input.region, analyticsAllowed: optimizationFlags().events && input.analytics_allowed, fingerprintKey: input.fingerprint_key as string | undefined })
}
const common = ['voter_key', 'region', 'analytics_allowed', 'fingerprint_key']
const fields = (input: Record<string, unknown>, extra: string[]) => Object.keys(input).every(k => [...common, ...extra].includes(k))

export const preferenceEndpoints: Endpoint[] = [
  endpoint('/optimization/preferences/legacy', async (req, input) => {
    const owner = identity(input)
    if (!owner || !fields(input, ['slug', 'action', 'operation_id', 'expected_revision']) || typeof input.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug) || (input.action !== 'like' && input.action !== 'unlike')) return reply({ error: 'invalid_input' }, 400)
    if (input.operation_id !== undefined && (typeof input.operation_id !== 'string' || !operationIdPattern.test(input.operation_id))) return reply({ error: 'operation_id' }, 400)
    if (input.expected_revision !== undefined && (!Number.isSafeInteger(input.expected_revision) || Number(input.expected_revision) < 0)) return reply({ error: 'revision' }, 400)
    return (await legacyPreferenceWrite(req, input.slug, input.action, [owner.voterKey, ...(owner.fingerprintKey ? [owner.fingerprintKey] : [])], input.operation_id as string | undefined, input.expected_revision as number | undefined, owner))!
  }),
  endpoint('/optimization/preferences/batch', async (req, input) => {
    const owner = identity(input), codes = parsePreferenceCodes(input.codes)
    if (!owner || !codes || !fields(input, ['codes'])) return reply({ error: 'invalid_input' }, 400)
    return reply({ items: await readPreferences(preferenceDatabase(req), codes, owner) })
  }),
  endpoint('/optimization/preferences/set', async (req, input) => {
    const owner = identity(input), parsed = parseSetPreference(input.mutation)
    if (!owner || !parsed || !isRecordId(input.project_code) || !fields(input, ['project_code', 'mutation'])) return reply({ error: 'invalid_input' }, 400)
    const result = await setPreference(preferenceDatabase(req), input.project_code, owner, parsed)
    return reply(result.body, result.status)
  }),
  endpoint('/optimization/preferences/sync', async (req, input) => {
    const owner = identity(input), parsed = parsePreferenceSync(input.migration)
    if (!owner || !parsed || !fields(input, ['migration'])) return reply({ error: 'invalid_input' }, 400)
    const result = await syncLegacyLikes(preferenceDatabase(req), owner, parsed)
    return reply(result.body, result.status)
  }),
  endpoint('/optimization/preferences/list', async (req, input) => {
    const owner = identity(input)
    if (!owner || !fields(input, ['after']) || (input.after !== undefined && !isRecordId(input.after))) return reply({ error: 'invalid_input' }, 400)
    const db = preferenceDatabase(req)
    const result = await db.execute(sql`
      SELECT p.code FROM projects p LEFT JOIN project_likes l ON l.project_id=p.id AND l.subject_key=${owner.subjectKey}
      WHERE p._status='published' AND p.code IS NOT NULL AND p.code>${input.after ?? ''}
      AND (l.liked=true OR (l.id IS NULL AND COALESCE(p.like_voters,'[]'::jsonb) @> ${JSON.stringify([owner.voterKey])}::jsonb))
      ORDER BY p.code LIMIT 51
    `)
    const codes = result.rows.slice(0, 50).map(row => String(row.code))
    return reply({ items: codes.length ? await readPreferences(db, codes, owner) : [], next_cursor: result.rows.length > 50 ? codes.at(-1) : null })
  }),
]

async function legacyProject(req: PayloadRequest, slug: string) {
  const db = preferenceDatabase(req)
  const rows = (await db.execute(sql`SELECT p.id,p.code,p.share_count,b.project_id AS canonical_owner FROM projects p LEFT JOIN project_like_baselines b ON b.project_id=p.id WHERE p.slug=${slug} OR p.import_key=${`catalog:${slug}`}`)).rows
  return { db, project: rows.length === 1 ? rows[0] : undefined }
}

/** Never fall back to the old increment after ownership has moved to a baseline. */
export async function legacyPreferenceWrite(req: PayloadRequest, slug: string, action: 'like' | 'unlike', keys: string[], operationId?: string, expectedRevision?: number, trustedIdentity?: ReturnType<typeof preferenceIdentity>): Promise<Response | null> {
  const { db, project } = await legacyProject(req, slug)
  if (!optimizationFlags().preferences && !project?.canonical_owner) return null
  if (!optimizationFlags().preferences) return reply({ error: 'preferences_disabled' }, 503)
  if ((process.env.OPTIMIZATION_PREFERENCES_SECRET ?? '').length < 32) return reply({ error: 'preferences_not_configured' }, 503)
  if (!project || !isRecordId(project.code)) return reply({ error: 'project_unavailable' }, 404)
  const voter = keys.find(k => voterKeyPattern.test(k))
  if (!voter) return reply({ error: 'browser_identity_required' }, 428)
  if (operationId !== undefined && !operationIdPattern.test(operationId)) return reply({ error: 'operation_id' }, 400)
  const owner = trustedIdentity ?? preferenceIdentity(voter, process.env.OPTIMIZATION_PREFERENCES_SECRET || '', { fingerprintKey: keys.find(k => fingerprintKeyPattern.test(k)) })
  const result = await setPreference(db, project.code, owner, { liked: action === 'like', operation_id: operationId ?? randomUUID(), expected_revision: expectedRevision, source: 'legacy_api' })
  if (result.status !== 200 || !('liked' in result.body)) return reply(result.body, result.status)
  return reply({ likes: result.body.likeCount, shares: Number(project.share_count ?? 0), liked: result.body.liked, revision: result.body.revision })
}

export async function legacyPreferenceRead(req: PayloadRequest, slug: string, key: string): Promise<Response | null> {
  const { db, project } = await legacyProject(req, slug)
  if (!project?.canonical_owner || !isRecordId(project.code)) return null
  if ((process.env.OPTIMIZATION_PREFERENCES_SECRET ?? '').length < 32) return reply({ error: 'preferences_not_configured' }, 503)
  const voter = voterKeyPattern.test(key) ? key : `c:${'0'.repeat(32)}`
  const owner = preferenceIdentity(voter, process.env.OPTIMIZATION_PREFERENCES_SECRET || '')
  const [item] = await readPreferences(db, [project.code], owner)
  if (!item || !('liked' in item)) return reply({ error: 'project_unavailable' }, 404)
  return reply({ likes: item.likeCount, shares: Number(project.share_count ?? 0), liked: voterKeyPattern.test(key) && item.liked })
}
