import { createHash, randomUUID } from 'node:crypto'
import { sql } from '@payloadcms/db-postgres'
import type { PreferenceDatabase } from './likes'
import type { CandidateSnapshot, EligibleCandidate } from './eligibility'
import type { DecisionItem, OptimizationMode } from '../../../src/lib/optimization/contracts'
import type { OptimizationContext } from '../../../src/lib/optimization/server-context'
import { signDecisionToken } from '../../../src/lib/optimization/decision-token'
import { operationIdPattern } from '../../../src/lib/optimization/preferences-contracts'

export type DecisionConfig = { id: string; mode: OptimizationMode; policyVersion: string; modelVersion: string; expiresInMs: number; content: Record<string, unknown> }
export type SelectedItem = DecisionItem & { samplingTrace: Record<string, unknown> }
export type StoredDecisionResult =
  | { status: 'hidden'; reason: 'catalog_authority_unavailable' }
  | { status: 'preview'; items: DecisionItem[] }
  | { status: 'ready' | 'shortfall'; decision_id: string; region: 'nn' | 'msk'; items: DecisionItem[]; policy_version: string; expires_at: string; decision_token: string; reused: boolean }
const hash = (value: string) => createHash('sha256').update(value).digest('hex')
const ms = (value: unknown) => value instanceof Date ? value.getTime() : Date.parse(String(value))
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`
  const encoded = JSON.stringify(value)
  if (encoded === undefined) throw new Error('Invalid decision config')
  return encoded
}

/** Internal persistence boundary, not a browser-selected slate API. AO-05 supplies the selector callback. */
export async function resolveStoredDecision(
  db: PreferenceDatabase, context: OptimizationContext, config: DecisionConfig,
  authority: () => Promise<CandidateSnapshot>, select: (candidates: readonly EligibleCandidate[]) => SelectedItem[],
  secret: string, options: { now?: number; recordAssignment?: boolean } = {},
): Promise<StoredDecisionResult> {
  const now = options.now ?? Date.now()
  if (!operationIdPattern.test(config.id) || !['manual', 'hybrid', 'automatic'].includes(config.mode) || !/^[A-Za-z0-9._-]{1,80}$/.test(config.policyVersion) || !/^[A-Za-z0-9._-]{1,80}$/.test(config.modelVersion) || config.expiresInMs < 60_000 || config.expiresInMs > 24 * 3600_000 || !Number.isSafeInteger(config.expiresInMs) || !/^[a-f0-9]{64}$/.test(context.subjectKey) || !/^[a-f0-9]{64}$/.test(context.sessionKey) || !['nn', 'msk'].includes(context.region) || secret.length < 32) throw new Error('Invalid decision context/config')
  const document = canonical({ content: config.content, mode: config.mode, policyVersion: config.policyVersion, modelVersion: config.modelVersion, expiresInMs: config.expiresInMs })
  if (Buffer.byteLength(document) > 16_384) throw new Error('Oversized decision config')
  const build = (candidates: EligibleCandidate[]) => {
    const selected = select(candidates)
    if (!Array.isArray(selected) || selected.length > 6 || new Set(selected.map(item => item.project_code)).size !== selected.length || new Set(selected.map(item => item.slot_position)).size !== selected.length || selected.some(item => !candidates.some(candidate => candidate.projectCode === item.project_code) || !Number.isInteger(item.slot_position) || item.slot_position < 1 || item.slot_position > 6 || !['manual', 'exploration', 'posterior', 'fallback'].includes(item.origin) || Buffer.byteLength(canonical(item.samplingTrace)) > 4096)) throw new Error('Invalid selected slate')
    return [...selected].sort((a, b) => a.slot_position - b.slot_position)
  }
  // Payload reads must finish before taking a Drizzle connection: otherwise concurrent
  // lock waiters can exhaust the pool while the owner waits for a second connection.
  const snapshot = await authority().catch(() => ({ status: 'unavailable' as const }))
  if (snapshot.status === 'unavailable') return { status: 'hidden', reason: 'catalog_authority_unavailable' }
  if (context.prefetch) {
    return { status: 'preview', items: build(snapshot.candidates).map(({ project_code, slot_position, origin }) => ({ project_code, slot_position, origin })) }
  }
  return db.transaction(async tx => {
    const scope = `home.popular_projects:${context.sessionKey}`
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`assignment:${context.subjectKey}:${context.region}:${scope}`},0))`)
    const candidates = snapshot.candidates
    if (new Set(candidates.map(item => item.projectCode)).size !== candidates.length || new Set(candidates.map(item => item.projectId)).size !== candidates.length) throw new Error('Duplicate candidate')
    await tx.execute(sql`INSERT INTO optimization_config_versions(id,content_hash,config) VALUES (${config.id},${hash(document)},${document}::jsonb) ON CONFLICT(id) DO NOTHING`)
    const existingConfig = (await tx.execute(sql`SELECT content_hash FROM optimization_config_versions WHERE id=${config.id}`)).rows[0]
    if (existingConfig?.content_hash !== hash(document)) throw new Error('Immutable config conflict')
    await tx.execute(sql`INSERT INTO optimization_assignment_heads(subject_key,region,scope) VALUES (${context.subjectKey},${context.region},${scope}) ON CONFLICT(subject_key,region,scope) DO NOTHING`)
    const head = (await tx.execute(sql`SELECT * FROM optimization_assignment_heads WHERE subject_key=${context.subjectKey} AND region=${context.region} AND scope=${scope} FOR UPDATE`)).rows[0]!
    const response = (id: string, assigned: number, expires: number, items: DecisionItem[], reused: boolean): StoredDecisionResult => ({ status: items.length === 6 ? 'ready' : 'shortfall', decision_id: id, region: context.region, items, policy_version: config.policyVersion, expires_at: new Date(expires).toISOString(), reused, decision_token: signDecisionToken({ decision_id: id, subject_key: context.subjectKey, session_key: context.sessionKey, region: context.region, assigned_at: assigned, expires_at: expires }, secret) })
    const lockPublication = async (items: DecisionItem[]) => {
      for (const item of [...items].sort((a, b) => a.project_code.localeCompare(b.project_code))) {
        const candidate = candidates.find(row => row.projectCode === item.project_code)!
        const live = (await tx.execute(sql`SELECT id FROM projects WHERE id=${candidate.projectId} AND code=${candidate.projectCode} AND _status='published' FOR SHARE`)).rows[0]
        if (!live) throw new Error('Publication changed during decision')
      }
    }
    if (head.current_decision_id) {
      const old = (await tx.execute(sql`SELECT * FROM optimization_decisions WHERE id=${head.current_decision_id}`)).rows[0]
      if (process.env.AO_TEST_DECISION_DEBUG === 'true' && old) console.info('decision reuse checks', Boolean(old.invalidated_at), old.config_version === config.id, old.subject_key === context.subjectKey, old.session_key === context.sessionKey, ms(old.expires_at) > now, typeof old.candidate_snapshot, (old.candidate_snapshot as { analytics_allowed?: boolean })?.analytics_allowed, context.analyticsAllowed)
      if (old && !old.invalidated_at && old.config_version === config.id && old.subject_key === context.subjectKey && old.session_key === context.sessionKey && ms(old.expires_at) > now && (old.candidate_snapshot as { analytics_allowed?: boolean })?.analytics_allowed === context.analyticsAllowed) {
        const items = (await tx.execute(sql`SELECT project_code,slot_position,origin FROM optimization_decision_items WHERE decision_id=${old.id} ORDER BY slot_position`)).rows.map(row => ({ project_code: String(row.project_code), slot_position: Number(row.slot_position), origin: row.origin as DecisionItem['origin'] }))
        if (process.env.AO_TEST_DECISION_DEBUG === 'true') console.info('decision item checks', items.map(item => candidates.some(candidate => candidate.projectCode === item.project_code)))
        if ((items.length || !candidates.length) && items.every(item => candidates.some(candidate => candidate.projectCode === item.project_code))) { await lockPublication(items); return response(String(old.id), ms(old.assigned_at), ms(old.expires_at), items, true) }
      }
      await tx.execute(sql`UPDATE optimization_decisions SET invalidated_at=COALESCE(invalidated_at,${new Date(now)}) WHERE id=${head.current_decision_id}`)
    }
    const items = build(candidates)
    // Lock the selected projects and check live publication immediately before the commit.
    await lockPublication(items)
    const id = randomUUID(), expires = now + config.expiresInMs
    const evidence = candidates.map(candidate => ({ project_id: candidate.projectId, project_code: candidate.projectCode, series: candidate.series, price: candidate.price, cover_hash: hash(candidate.imageUrl) })).sort((a, b) => a.project_code.localeCompare(b.project_code))
    const candidateHash = hash(canonical(evidence))
    await tx.execute(sql`INSERT INTO optimization_decisions(id,subject_key,session_key,region,mode,config_version,policy_version,model_version,candidate_set_hash,candidate_snapshot,assigned_at,expires_at)
      VALUES (${id},${context.subjectKey},${context.sessionKey},${context.region},${config.mode},${config.id},${config.policyVersion},${config.modelVersion},${candidateHash},${JSON.stringify({ analytics_allowed: context.analyticsAllowed, candidates: evidence })}::jsonb,${new Date(now)},${new Date(expires)})`)
    for (const item of items) await tx.execute(sql`INSERT INTO optimization_decision_items(decision_id,project_id,project_code,slot_position,origin,sampling_trace)
      VALUES (${id},${candidates.find(candidate => candidate.projectCode === item.project_code)!.projectId},${item.project_code},${item.slot_position},${item.origin},${JSON.stringify(item.samplingTrace)}::jsonb)`)
    if (context.analyticsAllowed && options.recordAssignment === true) {
      const payload = { event_type: 'ranking_assigned', decision_id: id, config_version: config.id, policy_version: config.policyVersion, model_version: config.modelVersion, candidate_set_hash: candidateHash }
      await tx.execute(sql`INSERT INTO optimization_events(event_id,payload_hash,event_type,schema_version,occurred_at,decision_id,subject_key,session_key,region,placement,payload)
        VALUES (${randomUUID()},${hash(canonical(payload))},'ranking_assigned',1,${new Date(now)},${id},${context.subjectKey},${context.sessionKey},${context.region},'home.popular_projects',${JSON.stringify(payload)}::jsonb)`)
    }
    await tx.execute(sql`UPDATE optimization_assignment_heads SET current_decision_id=${id},revision=revision+1 WHERE id=${head.id}`)
    return response(id, now, expires, items.map(({ project_code, slot_position, origin }) => ({ project_code, slot_position, origin })), false)
  })
}
