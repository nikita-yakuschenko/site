import { createHash, createHmac, randomUUID } from 'node:crypto'
import { sql } from '@payloadcms/db-postgres'
import type { OptimizationExecutor } from './repository'
import type { PreferenceReply, PreferenceState, PreferenceSource } from '../../../src/lib/optimization/preferences-contracts'
import { voterKeyPattern } from '../../../src/lib/optimization/preferences-contracts'

export type PreferenceDatabase = OptimizationExecutor & { transaction<T>(work: (tx: OptimizationExecutor) => Promise<T>): Promise<T> }
export type PreferenceIdentity = { subjectKey: string; voterKey: string; fingerprintKey?: string; analyticsAllowed: boolean; region: 'nn' | 'msk' }
type Row = Record<string, unknown>
const hash = (value: string) => createHash('sha256').update(value).digest('hex')
export function preferenceIdentity(voterKey: string, secret: string, options: Partial<Pick<PreferenceIdentity, 'fingerprintKey' | 'analyticsAllowed' | 'region'>> = {}): PreferenceIdentity {
  if (!voterKeyPattern.test(voterKey) || secret.length < 32) throw new Error('Invalid preference identity')
  return { subjectKey: createHmac('sha256', secret).update(`preferences:v1:${voterKey}`).digest('hex'), voterKey, region: options.region ?? 'nn', analyticsAllowed: options.analyticsAllowed === true, fingerprintKey: options.fingerprintKey }
}
const votersOf = (project: Row): string[] => Array.isArray(project.like_voters) ? project.like_voters.filter((v): v is string => typeof v === 'string') : []
const countOf = (project: Row, baseline?: Row) => baseline ? Number(baseline.baseline_count) + Number(baseline.new_active_count) - Number(baseline.retired_legacy_count) : Number(project.like_count ?? 0)

export async function baselineIsReady(tx: OptimizationExecutor, project: Row, baseline: Row) {
  const active = await tx.execute(sql`SELECT id FROM project_likes WHERE project_id=${project.id} LIMIT 1`)
  return active.rows.length > 0 || baseline.evidence_hash === hash(JSON.stringify([Number(project.like_count ?? 0), [...votersOf(project)].sort()]))
}

async function projectByCode(tx: OptimizationExecutor, code: string, lock = false) {
  const result = await tx.execute(sql`SELECT id,code,_status,like_count,share_count,like_voters FROM projects WHERE code=${code} ${lock ? sql`FOR UPDATE` : sql``}`)
  return result.rows[0]
}
async function baselineOf(tx: OptimizationExecutor, id: unknown) {
  return (await tx.execute(sql`SELECT * FROM project_like_baselines WHERE project_id=${id}`)).rows[0]
}
async function preferenceOf(tx: OptimizationExecutor, id: unknown, identity: PreferenceIdentity) {
  return (await tx.execute(sql`SELECT * FROM project_likes WHERE project_id=${id} AND subject_key=${identity.subjectKey}`)).rows[0]
}
function state(project: Row, baseline: Row | undefined, preference: Row | undefined, identity: PreferenceIdentity): PreferenceState {
  return { project_code: String(project.code), liked: preference ? Boolean(preference.liked) : votersOf(project).includes(identity.voterKey), likeCount: countOf(project, baseline), revision: Number(preference?.revision ?? 0), reconciliation: !baseline ? 'required' : preference?.contribution === 'pending' ? 'pending' : 'ready' }
}

/** Explicit cutover preparation, never called by GET/PUT or onInit. */
export async function captureLikeBaseline(db: PreferenceDatabase, code: string, version: string) {
  if (!/^[A-Za-z0-9._-]{1,120}$/.test(version)) throw new Error('Invalid reconciliation version')
  return db.transaction(async tx => {
    const project = await projectByCode(tx, code, true)
    if (!project) throw new Error('Unknown project code')
    if (await baselineOf(tx, project.id)) return 'already_prepared' as const
    const count = Number(project.like_count ?? 0), voters = votersOf(project)
    const invalid = project.like_voters != null && (!Array.isArray(project.like_voters) || project.like_voters.length !== voters.length)
    if (invalid || !Number.isInteger(count) || count < 0 || count > 2_147_483_647 || new Set(voters).size !== voters.length || voters.some(v => !/^[acf]:[a-z0-9]{16,64}$/.test(v)) || voters.filter(v => v.startsWith('c:')).length > count) throw new Error('Legacy baseline requires reconciliation')
    await tx.execute(sql`INSERT INTO project_like_baselines(project_id,baseline_count,evidence_hash,reconciliation_version) VALUES (${project.id},${count},${hash(JSON.stringify([count, [...voters].sort()]))},${version})`)
    return 'prepared' as const
  })
}

export async function readPreferences(db: OptimizationExecutor, codes: string[], identity: PreferenceIdentity) {
  // One query for a bounded batch; no per-card request or mutating GET.
  const result = await db.execute(sql`
    SELECT p.code,p.like_count,p.like_voters,b.baseline_count,b.new_active_count,b.retired_legacy_count,l.liked,l.revision,l.contribution
    FROM projects p LEFT JOIN project_like_baselines b ON b.project_id=p.id
    LEFT JOIN project_likes l ON l.project_id=p.id AND l.subject_key=${identity.subjectKey}
    WHERE p.code IN (${sql.join(codes.map(c => sql`${c}`), sql`,`)}) AND p._status='published'
  `)
  const byCode = new Map(result.rows.map(row => [String(row.code), row]))
  return codes.map(code => {
    const row = byCode.get(code)
    return row ? state(row, row.baseline_count == null ? undefined : row, row.revision == null ? undefined : row, identity) : { project_code: code, unavailable: true as const }
  })
}

/** Called only with the project row locked; serializes counts, claims and state. */
export async function applyPreference(tx: OptimizationExecutor, project: Row, baseline: Row, identity: PreferenceIdentity, desired: boolean, source: PreferenceSource | 'migration', migrationId?: string, operationId?: string) {
  let row = await preferenceOf(tx, project.id, identity)
  if (source === 'migration' && row) return state(project, baseline, row, identity)
  if (!row) {
    let contribution = 'new', liked = false
    const voters = votersOf(project)
    if (voters.includes(identity.voterKey)) {
      const claimed = await tx.execute(sql`INSERT INTO project_like_legacy_claims(project_id,key_hash,subject_key) VALUES (${project.id},${hash(identity.voterKey)},${identity.subjectKey}) ON CONFLICT(project_id,key_hash) DO NOTHING RETURNING id`)
      const owner = claimed.rows.length ? identity.subjectKey : (await tx.execute(sql`SELECT subject_key FROM project_like_legacy_claims WHERE project_id=${project.id} AND key_hash=${hash(identity.voterKey)}`)).rows[0]?.subject_key
      contribution = owner === identity.subjectKey ? 'legacy' : 'pending'
      liked = true
    } else if ((identity.fingerprintKey && voters.includes(identity.fingerprintKey)) || (source === 'migration' && Number(baseline.baseline_count) > 0)) contribution = 'pending'
    row = (await tx.execute(sql`INSERT INTO project_likes(project_id,subject_key,liked,contribution,source) VALUES (${project.id},${identity.subjectKey},${liked},${contribution},${source}) RETURNING *`)).rows[0]!
  }
  // A stale localStorage import never resurrects a canonical unlike tombstone.
  const changed = Boolean(row.liked) !== desired
  if (changed) {
    const delta = desired ? 1 : -1
    if (row.contribution === 'new') await tx.execute(sql`UPDATE project_like_baselines SET new_active_count=new_active_count+${delta} WHERE project_id=${project.id}`)
    if (row.contribution === 'legacy') await tx.execute(sql`UPDATE project_like_baselines SET retired_legacy_count=retired_legacy_count-${delta} WHERE project_id=${project.id}`)
    row = (await tx.execute(sql`UPDATE project_likes SET liked=${desired},revision=revision+1,source=${source},migration_marker=COALESCE(migration_marker,${migrationId ?? null}::uuid),updated_at=now() WHERE id=${row.id} RETURNING *`)).rows[0]!
    if (!desired && row.contribution === 'legacy') await tx.execute(sql`UPDATE projects SET like_voters=COALESCE(like_voters,'[]'::jsonb)-${identity.voterKey} WHERE id=${project.id}`)
    if (source !== 'migration' && identity.analyticsAllowed) {
      const eventId = randomUUID(), eventType = desired ? 'project_liked' : 'project_unliked'
      const payload = JSON.stringify({ source, operation_id: operationId, reward_eligible: false, reason: row.contribution === 'pending' ? 'reconciliation_pending' : 'no_exposure_attribution' })
      await tx.execute(sql`INSERT INTO optimization_events(event_id,payload_hash,event_type,schema_version,occurred_at,project_id,project_code,subject_key,region,component,payload) VALUES (${eventId},${hash(payload)},${eventType},1,now(),${project.id},${project.code},${identity.subjectKey},${identity.region},${source},${payload}::jsonb)`)
    }
  }
  const updatedBaseline = (await baselineOf(tx, project.id))!
  const current = state(project, updatedBaseline, row, identity)
  await tx.execute(sql`UPDATE projects SET like_count=${current.likeCount} WHERE id=${project.id}`)
  return current
}

export async function setPreference(db: PreferenceDatabase, code: string, identity: PreferenceIdentity, input: { liked: boolean; operation_id: string; expected_revision?: number; source: PreferenceSource }): Promise<PreferenceReply> {
  const bodyHash = hash(JSON.stringify([code, input.liked, input.expected_revision ?? null, input.source]))
  return db.transaction(async tx => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`ao-like:${identity.subjectKey}:${input.operation_id}`},0))`)
    const operation = (await tx.execute(sql`SELECT body_hash,response FROM project_like_operations WHERE subject_key=${identity.subjectKey} AND operation_id=${input.operation_id}`)).rows[0]
    if (operation) return operation.body_hash === bodyHash ? operation.response as PreferenceReply : { status: 409, body: { error: 'operation_conflict' } }
    const project = await projectByCode(tx, code, true)
    if (!project || project._status !== 'published') return { status: 404, body: { error: 'project_unavailable' } }
    const baseline = await baselineOf(tx, project.id)
    if (!baseline) return { status: 409, body: { error: 'reconciliation_required' } }
    if (!await baselineIsReady(tx, project, baseline)) return { status: 409, body: { error: 'baseline_changed' } }
    const current = state(project, baseline, await preferenceOf(tx, project.id, identity), identity)
    const response: PreferenceReply = input.expected_revision !== undefined && input.expected_revision !== current.revision
      ? { status: 409, body: { error: 'stale_revision', current } }
      : { status: 200, body: await applyPreference(tx, project, baseline, identity, input.liked, input.source, undefined, input.operation_id) }
    await tx.execute(sql`INSERT INTO project_like_operations(operation_id,subject_key,body_hash,response) VALUES (${input.operation_id},${identity.subjectKey},${bodyHash},${JSON.stringify(response)}::jsonb)`)
    return response
  })
}
