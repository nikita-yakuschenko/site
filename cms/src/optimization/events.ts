import { createHash } from 'node:crypto'
import { sql } from '@payloadcms/db-postgres'
import { appendAuthorizedClientEvent, eventPayloadHash } from './repository'
import type { PreferenceDatabase } from './likes'
import type { OptimizationExecutor } from './repository'
import type { ClientOptimizationEvent, EventBatch } from '../../../src/lib/optimization/contracts'
import { MAX_CLOCK_SKEW_MS } from '../../../src/lib/optimization/contracts'
import { verifyDecisionToken } from '../../../src/lib/optimization/decision-token'
import type { OptimizationContext } from '../../../src/lib/optimization/server-context'

export class EventIngressError extends Error {
  constructor(public reason: string, public status = 409) { super(reason) }
}
export const VISIBILITY_RULE_VERSION = 'continuous-50pct-1000ms-v1'
type Receipt = { event_id: string; status: 'accepted' | 'duplicate'; exposure_id?: string }
const millis = (value: unknown) => value instanceof Date ? value.getTime() : Date.parse(String(value))

async function authorize(tx: OptimizationExecutor, event: ClientOptimizationEvent, batch: EventBatch, context: OptimizationContext, secret: string, now: number) {
  if (event.region !== context.region) throw new EventIngressError('region_mismatch')
  if (!('decision_id' in event) || !event.decision_id) {
    if ('project_code' in event && event.project_code) {
      const project = (await tx.execute(sql`SELECT id FROM projects WHERE code=${event.project_code} AND _status='published'`)).rows[0]
      if (!project) throw new EventIngressError('project_unavailable', 400)
      return { projectId: Number(project.id) }
    }
    return { projectId: null }
  }
  const token = verifyDecisionToken(batch.decision_token, secret, now)
  if (!token || token.decision_id !== event.decision_id || token.subject_key !== context.subjectKey || token.session_key !== context.sessionKey || token.region !== context.region) throw new EventIngressError('decision_context', 403)
  const row = (await tx.execute(sql`
    SELECT d.*,i.project_id FROM optimization_decisions d JOIN optimization_decision_items i ON i.decision_id=d.id
    WHERE d.id=${event.decision_id} AND i.project_code=${event.project_code} AND i.slot_position=${event.slot_position}
  `)).rows[0]
  if (!row || row.subject_key !== context.subjectKey || row.session_key !== context.sessionKey || row.region !== context.region || millis(row.assigned_at) !== token.assigned_at || millis(row.expires_at) !== token.expires_at) throw new EventIngressError('decision_context', 403)
  if (!(row.candidate_snapshot as { analytics_allowed?: boolean })?.analytics_allowed) throw new EventIngressError('decision_not_learning', 403)
  const occurred = Date.parse(event.occurred_at)
  if (occurred < token.assigned_at - MAX_CLOCK_SKEW_MS || occurred > token.expires_at + MAX_CLOCK_SKEW_MS || (row.invalidated_at && occurred > millis(row.invalidated_at))) throw new EventIngressError('decision_expired', 403)
  return { projectId: row.project_id == null ? null : Number(row.project_id), scope: createHash('sha256').update(`home.popular_projects:${context.sessionKey}:${VISIBILITY_RULE_VERSION}`).digest('hex') }
}

/** Validate ownership and exact item, then append event + exposure in one transaction. No prefix commits. */
export async function ingestOptimizationEvents(db: PreferenceDatabase, batch: EventBatch, context: OptimizationContext, secret: string, now = Date.now()) {
  if (!context.analyticsAllowed || context.prefetch) throw new EventIngressError('analytics_consent_required', 403)
  return db.transaction(async tx => {
    // Stable lock order covers concurrent retries, alternate UUIDs for one exposure and mixed batches.
    const locks = new Set(batch.events.map(event => `event:${event.event_id}`))
    for (const event of batch.events) if ('decision_id' in event && event.decision_id) locks.add(`exposure:${event.decision_id}:${event.project_code}:${event.slot_position}:${context.sessionKey}`)
    for (const key of [...locks].sort()) await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`optimization:${key}`},0))`)
    const results = new Map<string, Receipt>()
    // A delivery batch may put a click before its impression. The FK is still created before the click.
    const ordered = [...batch.events].sort((a, b) => Number(b.event_type === 'project_impression') - Number(a.event_type === 'project_impression'))
    for (const event of ordered) {
      const authorized = await authorize(tx, event, batch, context, secret, now)
      const owner = { subjectKey: context.subjectKey, sessionKey: context.sessionKey, projectId: authorized.projectId }
      const prior = (await tx.execute(sql`SELECT payload_hash,exposure_id FROM optimization_events WHERE event_id=${event.event_id}`)).rows[0]
      if (prior) {
        if (prior.payload_hash !== eventPayloadHash(event, owner)) throw new EventIngressError('event_conflict')
        results.set(event.event_id, { event_id: event.event_id, status: 'duplicate', ...(prior.exposure_id ? { exposure_id: String(prior.exposure_id) } : {}) }); continue
      }
      let exposureId: string | undefined
      let duplicateExposure = false
      if ('decision_id' in event && event.decision_id) {
        if (event.event_type === 'project_impression') {
          const usedId = (await tx.execute(sql`SELECT * FROM optimization_exposures WHERE id=${event.exposure_id}`)).rows[0]
          if (usedId && (usedId.decision_id !== event.decision_id || usedId.project_code !== event.project_code || Number(usedId.position) !== event.slot_position || usedId.scope_key !== authorized.scope)) throw new EventIngressError('exposure_conflict')
          const existing = (await tx.execute(sql`SELECT id FROM optimization_exposures WHERE decision_id=${event.decision_id} AND project_code=${event.project_code} AND position=${event.slot_position} AND scope_key=${authorized.scope}`)).rows[0]
          if (existing) { exposureId = String(existing.id); duplicateExposure = true }
          else {
            exposureId = event.exposure_id
            await tx.execute(sql`INSERT INTO optimization_exposures(id,decision_id,project_code,position,scope_key,region,visible_at,visibility_rule_version)
              VALUES (${exposureId},${event.decision_id},${event.project_code},${event.slot_position},${authorized.scope},${context.region},${event.occurred_at},${VISIBILITY_RULE_VERSION})`)
          }
        } else {
          const exposure = (await tx.execute(sql`SELECT * FROM optimization_exposures WHERE id=${event.exposure_id} AND decision_id=${event.decision_id} AND project_code=${event.project_code} AND position=${event.slot_position} AND scope_key=${authorized.scope}`)).rows[0]
          if (!exposure || millis(exposure.visible_at) > Date.parse(event.occurred_at) + MAX_CLOCK_SKEW_MS) throw new EventIngressError('exposure_required')
          exposureId = String(exposure.id)
        }
      }
      const status = await appendAuthorizedClientEvent(tx, event, { ...owner, resolvedExposureId: exposureId })
      if (status === 'conflict') throw new EventIngressError('event_conflict')
      results.set(event.event_id, { event_id: event.event_id, status: duplicateExposure ? 'duplicate' : status, ...(exposureId ? { exposure_id: exposureId } : {}) })
    }
    return { results: batch.events.map(event => results.get(event.event_id)!) }
  })
}
