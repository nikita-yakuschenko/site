import { createHash } from 'node:crypto'
import { sql } from '@payloadcms/db-postgres'
import { isRecordId } from '../../../src/lib/record-id'
import type { PreferenceSyncInput, PreferenceState } from '../../../src/lib/optimization/preferences-contracts'
import { applyPreference, baselineIsReady, type PreferenceDatabase, type PreferenceIdentity } from './likes'

type SyncItem = { legacy_id: string; result: 'synced' | 'unknown' | 'ambiguous' | 'unavailable' | 'requires_baseline'; state?: PreferenceState }
export type SyncReply = { status: number; body: { error: string } | { completed: boolean; items: SyncItem[] } }

export async function syncLegacyLikes(db: PreferenceDatabase, identity: PreferenceIdentity, input: PreferenceSyncInput): Promise<SyncReply> {
  const digest = createHash('sha256').update(JSON.stringify(input.legacy_ids)).digest('hex')
  return db.transaction(async tx => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`ao-like-sync:${identity.subjectKey}:${input.migration_id}`},0))`)
    const old = (await tx.execute(sql`SELECT body_hash,response FROM project_like_migration_batches WHERE subject_key=${identity.subjectKey} AND migration_id=${input.migration_id}`)).rows[0]
    if (old) return old.body_hash === digest ? old.response as SyncReply : { status: 409, body: { error: 'migration_conflict' } }
    const resolved: { legacyId: string; projects: Record<string, unknown>[] }[] = []
    for (const legacyId of input.legacy_ids) {
      if (legacyId.startsWith('referral:')) { resolved.push({ legacyId, projects: [] }); continue }
      const condition = isRecordId(String(legacyId)) ? sql`code=${legacyId}`
        : /^cms:[1-9][0-9]{0,9}$/.test(legacyId) && Number(legacyId.slice(4)) <= 2_147_483_647 ? sql`id=${Number(legacyId.slice(4))}`
          : /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(legacyId) ? sql`slug=${legacyId} OR import_key=${`catalog:${legacyId}`}` : sql`false`
      const projects = (await tx.execute(sql`SELECT id FROM projects WHERE ${condition}`)).rows
      resolved.push({ legacyId, projects })
    }
    // Acquire all project locks in numeric order: opposite browser import order cannot deadlock.
    const ids = [...new Set(resolved.filter(r => r.projects.length === 1).map(r => Number(r.projects[0]!.id)))].sort((a, b) => a - b)
    const locked = ids.length ? (await tx.execute(sql`SELECT id,code,_status,like_count,like_voters FROM projects WHERE id IN (${sql.join(ids.map(id => sql`${id}`), sql`,`)}) ORDER BY id FOR UPDATE`)).rows : []
    const byId = new Map(locked.map(p => [Number(p.id), p]))
    const items: SyncItem[] = []
    for (const item of resolved) {
      if (item.projects.length !== 1) { items.push({ legacy_id: item.legacyId, result: item.projects.length > 1 ? 'ambiguous' : 'unknown' }); continue }
      const project = byId.get(Number(item.projects[0]!.id))!
      if (project._status !== 'published' || !isRecordId(project.code)) { items.push({ legacy_id: item.legacyId, result: 'unavailable' }); continue }
      const baseline = (await tx.execute(sql`SELECT * FROM project_like_baselines WHERE project_id=${project.id}`)).rows[0]
      if (!baseline || !await baselineIsReady(tx, project, baseline)) { items.push({ legacy_id: item.legacyId, result: 'requires_baseline' }); continue }
      const state = await applyPreference(tx, project, baseline, identity, true, 'migration', input.migration_id)
      items.push({ legacy_id: item.legacyId, result: 'synced', state })
    }
    const response: SyncReply = { status: 200, body: { completed: items.every(i => i.result !== 'requires_baseline'), items } }
    if (response.body && 'completed' in response.body && response.body.completed) {
      await tx.execute(sql`INSERT INTO project_like_migration_batches(migration_id,subject_key,body_hash,response) VALUES (${input.migration_id},${identity.subjectKey},${digest},${JSON.stringify(response)}::jsonb)`)
    }
    return response
  })
}
