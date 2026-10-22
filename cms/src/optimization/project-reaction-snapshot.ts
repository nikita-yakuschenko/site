import type { PayloadRequest } from 'payload'
import { sql } from '@payloadcms/db-postgres'
import type { OptimizationExecutor } from './repository'

/** Keep editor saves from overwriting a canonical count read before a concurrent like. */
export async function canonicalReactionSnapshot(req: PayloadRequest, projectId: number) {
  // Payload supplies a truthy, empty originalDoc during create, before an id exists.
  if (!Number.isSafeInteger(projectId) || projectId <= 0) return null
  const adapter = req.payload.db as unknown as { drizzle: OptimizationExecutor; sessions?: Record<string, { db: OptimizationExecutor }> }
  const transactionId = req.transactionID ? String(await req.transactionID) : undefined
  const tx = transactionId ? adapter.sessions?.[transactionId]?.db : undefined
  const executor = tx ?? adapter.drizzle
  if (!(await executor.execute(sql`SELECT to_regclass('public.project_like_baselines') AS name`)).rows[0]?.name) return null
  // Lock before checking ownership, including a concurrent baseline cutover.
  if (tx) await tx.execute(sql`SELECT id FROM projects WHERE id=${projectId} FOR UPDATE`)
  const owner = await executor.execute(sql`SELECT project_id FROM project_like_baselines WHERE project_id=${projectId}`)
  if (!owner.rows.length) return null
  if (!tx) throw new Error('Canonical project updates require a transaction')
  return (await tx.execute(sql`SELECT b.baseline_count+b.new_active_count-b.retired_legacy_count AS like_count,p.share_count,p.view_count,p.like_voters,p.share_voters FROM projects p JOIN project_like_baselines b ON b.project_id=p.id WHERE p.id=${projectId}`)).rows[0]!
}
