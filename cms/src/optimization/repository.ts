import { createHash } from 'node:crypto'
import { sql } from '@payloadcms/db-postgres'
import type { ClientOptimizationEvent } from '../../../src/lib/optimization/contracts'

export type OptimizationExecutor = {
  execute: (query: ReturnType<typeof sql>) => Promise<{ rows: Record<string, unknown>[] }>
}

export type AuthorizedEventContext = {
  subjectKey: string | null
  sessionKey: string | null
  projectId: number | null
  resolvedExposureId?: string
}

export function eventPayloadHash(event: ClientOptimizationEvent, context: AuthorizedEventContext) {
  const sorted = Object.fromEntries(Object.entries(event).filter(([, value]) => value !== undefined).sort(([a], [b]) => a.localeCompare(b)))
  return createHash('sha256').update(JSON.stringify([sorted, context.subjectKey, context.sessionKey, context.projectId])).digest('hex')
}

/**
 * Persistence primitive, not an ingress endpoint. The caller must first authorize
 * the subject/decision/item and resolve project_code. Pass its transaction executor
 * when writing an exposure and event together. Never updates an existing fact.
 */
export async function appendAuthorizedClientEvent(db: OptimizationExecutor, event: ClientOptimizationEvent, context: AuthorizedEventContext): Promise<'accepted' | 'duplicate' | 'conflict'> {
  const hash = eventPayloadHash(event, context)
  const projectCode = 'project_code' in event ? event.project_code ?? null : null
  const decisionId = 'decision_id' in event ? event.decision_id ?? null : null
  const exposureId = context.resolvedExposureId ?? ('exposure_id' in event ? event.exposure_id ?? null : null)
  const position = 'slot_position' in event ? event.slot_position ?? null : null
  const placement = 'placement' in event ? event.placement ?? null : null
  const component = 'source_component' in event ? event.source_component : null
  const inserted = await db.execute(sql`
    INSERT INTO "optimization_events" (
      "event_id", "payload_hash", "event_type", "schema_version", "occurred_at",
      "project_id", "project_code", "decision_id", "exposure_id", "subject_key", "session_key",
      "region", "placement", "component", "position", "payload"
    ) VALUES (
      ${event.event_id}, ${hash}, ${event.event_type}, 1, ${event.occurred_at},
      ${context.projectId}, ${projectCode}, ${decisionId}, ${exposureId}, ${context.subjectKey}, ${context.sessionKey},
      ${event.region}, ${placement}, ${component}, ${position}, ${JSON.stringify(event)}::jsonb
    ) ON CONFLICT ("event_id") DO NOTHING RETURNING "event_id"
  `)
  if (inserted.rows.length) return 'accepted'
  const existing = await db.execute(sql`SELECT "payload_hash" FROM "optimization_events" WHERE "event_id" = ${event.event_id}`)
  return existing.rows[0]?.payload_hash === hash ? 'duplicate' : 'conflict'
}
