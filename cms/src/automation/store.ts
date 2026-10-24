import type { Payload, PayloadRequest } from 'payload'
import { sql } from '@payloadcms/db-postgres'
import { randomUUID } from 'node:crypto'
import { mergeConfig, type AutomationConfig } from './model'
import { seal, unseal } from './crypto'

export async function settings(payload: Payload) {
  const saved = await payload.findGlobal({ slug: 'automation-settings', depth: 0, overrideAccess: true })
  const raw = saved.vault && typeof saved.vault === 'object' && !Array.isArray(saved.vault) ? saved.vault as Record<string, unknown> : {}
  return { config: mergeConfig(saved.config), vault: raw, secret: (key: string) => unseal(raw[key]), cutover: saved.cutover }
}
export async function saveSettings(payload: Payload, config: AutomationConfig, secrets: Record<string, string> = {}, cutover?: Record<string, unknown>) {
  const current = await settings(payload)
  const vault = { ...current.vault }
  for (const [key, value] of Object.entries(secrets)) if (value) vault[key] = seal(value)
  return payload.updateGlobal({ slug: 'automation-settings', data: { config, vault, ...(cutover ? { cutover } : {}) }, overrideAccess: true })
}
export async function enqueue(payload: Payload, kind: string, data: Record<string, unknown>, key: string = randomUUID(), runAt = new Date().toISOString(), req?: PayloadRequest) {
  const existing = await payload.find({ collection: 'automation-jobs', where: { key: { equals: key } }, limit: 1, depth: 0, overrideAccess: true, req })
  if (existing.docs[0]) return existing.docs[0]
  try { return await payload.create({ collection: 'automation-jobs', data: { key, kind, data, status: 'queued', runAt, attempts: 0 }, overrideAccess: true, req }) }
  catch (error) {
    const repeated = await payload.find({ collection: 'automation-jobs', where: { key: { equals: key } }, limit: 1, depth: 0, overrideAccess: true })
    if (repeated.docs[0]) return repeated.docs[0]
    throw error
  }
}
type Adapter = { drizzle: { execute: (query: ReturnType<typeof sql>) => Promise<{ rows: { id: number; lease: string }[] }> } }
export async function claimJob(payload: Payload) {
  const lease = randomUUID(), adapter = payload.db as unknown as Adapter
  const result = await adapter.drizzle.execute(sql`
    UPDATE automation_jobs SET status='running', lease=${lease}, locked_at=now(), attempts=coalesce(attempts,0)+1, updated_at=now()
    WHERE id=(SELECT id FROM automation_jobs WHERE (status='queued' AND run_at<=now()) OR (status='running' AND locked_at<now()-interval '10 minutes') ORDER BY run_at,id FOR UPDATE SKIP LOCKED LIMIT 1)
    RETURNING id,lease
  `)
  if (!result.rows[0]) return null
  const job = await payload.findByID({ collection: 'automation-jobs', id: result.rows[0].id, depth: 0, overrideAccess: true })
  return { job, lease }
}
export async function finishJob(payload: Payload, id: number, lease: string, result: Record<string, unknown>) {
  return payload.update({ collection: 'automation-jobs', where: { and: [{ id: { equals: id } }, { lease: { equals: lease } }] }, data: { status: 'completed', completedAt: new Date().toISOString(), result, lastError: null, lease: null, lockedAt: null }, overrideAccess: true })
}
export async function failJob(payload: Payload, id: number, lease: string, attempts: number, error: unknown, pause = false) {
  const safe = error instanceof Error ? error.message.replace(/https?:\/\/\S+/g, '[address]').slice(0, 400) : 'Ошибка обработки'
  return payload.update({ collection: 'automation-jobs', where: { and: [{ id: { equals: id } }, { lease: { equals: lease } }] }, data: { status: !pause && attempts >= 12 ? 'failed' : 'queued', attempts: pause ? Math.max(0, attempts - 1) : attempts, runAt: new Date(Date.now() + (pause ? 60000 : Math.min(3600000, 5000 * 2 ** attempts))).toISOString(), lastError: safe, lease: null, lockedAt: null }, overrideAccess: true })
}
