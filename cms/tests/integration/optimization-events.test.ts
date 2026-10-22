import assert from 'node:assert/strict'
import test from 'node:test'
import { randomUUID } from 'node:crypto'
import { getPayload, handleEndpoints, createLocalReq } from 'payload'
import { sql } from '@payloadcms/db-postgres'
import { listenOptimizationHTTP } from '../support/optimization-http'
import { resolveStoredDecision, type DecisionConfig, type SelectedItem } from '../../src/optimization/decisions'
import { readAuthoritativeCandidates, type CandidateSnapshot, type EligibleCandidate } from '../../src/optimization/eligibility'
import type { PreferenceDatabase } from '../../src/optimization/likes'
import { createOptimizationCookie, verifyOptimizationCookie, OPTIMIZATION_CONTEXT_COOKIE } from '../../../src/lib/optimization/server-context'
import { handleOptimizationEvents } from '../../../src/lib/optimization/events-server'
import { CONSENT_COOKIE, CONSENT_VERSION } from '../../../src/consent/types'
import { signDecisionToken, verifyDecisionToken } from '../../../src/lib/optimization/decision-token'
import type { ClientOptimizationEvent, EventBatch } from '../../../src/lib/optimization/contracts'

const target = process.env.OPTIMIZATION_EVENTS_TEST_DATABASE_URL
const secret = 'ao04-disposable-context-secret-at-least-32-chars'
test('real Payload + PostgreSQL: atomic decisions, signed ingress, exposure dedup and fail-closed publication', { skip: !target }, async t => {
  const url = new URL(target!)
  assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname))
  assert.match(url.pathname, /^\/ao_test_(?:release|payload)$/)
  const before = { ...process.env }
  Object.assign(process.env, { DATABASE_URL: target, PAYLOAD_SECRET: 'ao04-disposable-payload-integration-secret-32-chars', CMS_PUBLIC_URL: 'http://127.0.0.1:3001', CMS_SITE_API_KEY: 'ao04-disposable-site-api-key-at-least-32-chars', CMS_SEED: '0', PAYLOAD_DB_PUSH: 'false', NEXT_PHASE: 'phase-production-build', OPTIMIZATION_ENABLED: 'true', OPTIMIZATION_EVENTS_ENABLED: 'true', OPTIMIZATION_RANKING_ENABLED: 'true', OPTIMIZATION_CONTEXT_SECRET: secret })
  const { default: config } = await import('../../src/payload.config')
  const payload = await getPayload({ config })
  const db = (payload.db as unknown as { drizzle: PreferenceDatabase }).drizzle
  const req = await createLocalReq({}, payload)
  const cms = await listenOptimizationHTTP(request => handleEndpoints({ config, request }))
  process.env.CMS_PUBLIC_URL = cms.origin
  const site = await listenOptimizationHTTP(handleOptimizationEvents)
  process.env.NEXT_PUBLIC_SITE_URL = site.origin
  const cookie = createOptimizationCookie(secret), identity = verifyOptimizationCookie(cookie, secret)!
  const context = { ...identity, region: 'nn' as const, analyticsAllowed: true, prefetch: false }
  const configID = randomUUID()
  const decisionConfig: DecisionConfig = { id: configID, mode: 'automatic', policyVersion: 'synthetic-persistence-v1', modelVersion: 'none', expiresInMs: 3600_000, content: { synthetic: true } }
  const projects: number[] = []
  const prices: number[] = []
  const scope = `home.popular_projects:${context.sessionKey}`
  const select = (candidates: readonly EligibleCandidate[]): SelectedItem[] => candidates.slice(0, 6).map((candidate, index) => ({ project_code: candidate.projectCode, slot_position: index + 1, origin: 'exploration', samplingTrace: { synthetic: true } }))
  const authority = () => readAuthoritativeCandidates(req, 'nn')
  const consent = (analytics: boolean) => encodeURIComponent(JSON.stringify({ version: CONSENT_VERSION, decidedAt: new Date().toISOString(), necessary: true, functional: false, analytics, marketing: false }))
  const send = async (batch: unknown, options: { context?: string; analytics?: boolean; origin?: string; region?: string } = {}) => fetch(`${site.origin}/api/optimization/events`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: options.origin ?? site.origin, cookie: `${OPTIMIZATION_CONTEXT_COOKIE}=${options.context ?? cookie}; ${CONSENT_COOKIE}=${consent(options.analytics ?? true)}; avgst_region=${options.region ?? 'nn'}` }, body: JSON.stringify(batch) })
  const batchFor = (events: ClientOptimizationEvent[], token?: string): EventBatch => ({ schema_version: 1, batch_id: randomUUID(), events, ...(token ? { decision_token: token } : {}) })
  const rows = async (query: ReturnType<typeof sql>) => (await db.execute(query)).rows
  let decision: Awaited<ReturnType<typeof resolveStoredDecision>>
  try {
    for (let i = 0; i < 2; i++) {
      const project = await payload.create({ collection: 'projects', overrideAccess: true, data: { name: `AO04 synthetic ${i}`, slug: `ao04-${randomUUID()}`, recordType: 'project', technologyBadge: 'Панельно-каркасный', areaValue: 80, floorsValue: 1, bedrooms: 2, bathrooms: 1, imageUrl: '/fixtures/house-1.jpg', _status: 'published' } })
      projects.push(project.id)
      const price = await payload.create({ collection: 'project-prices', overrideAccess: true, data: { lookupKey: 'synthetic', project: project.id, configuration: 'standard', region: 'nn', price: 5_000_000 } })
      prices.push(price.id)
    }
    await t.test('authoritative eligibility uses the catalogue standard regional price and primary cover', async () => {
      const nn = await authority(), msk = await readAuthoritativeCandidates(req, 'msk')
      assert.equal(nn.status, 'available'); assert.equal(msk.status, 'available')
      if (nn.status !== 'available' || msk.status !== 'available') return
      assert.equal(nn.candidates.length, 2); assert.equal(nn.candidates[0].price, 5_000_000)
      assert.equal(msk.candidates.length, 0)
      assert.ok(msk.excluded.every(item => item.reason === 'missing_region_price'))
    })
    await t.test('prefetch never persists; twelve concurrent assignments share exactly one head/decision/event', async () => {
      const preview = await resolveStoredDecision(db, { ...context, prefetch: true }, decisionConfig, authority, select, secret, { recordAssignment: true })
      assert.equal(preview.status, 'preview')
      assert.equal((await rows(sql`SELECT id FROM optimization_assignment_heads WHERE subject_key=${context.subjectKey}`)).length, 0)
      const attempts = await Promise.allSettled(Array.from({ length: 12 }, () => resolveStoredDecision(db, context, decisionConfig, authority, select, secret, { recordAssignment: true })))
      console.info('all assignment attempts completed', attempts.map(result => result.status))
      const errors = attempts.flatMap(result => result.status === 'rejected' ? [String(result.reason) + ' cause=' + String(result.reason?.cause)] : [])
      assert.deepEqual(errors, [])
      const concurrent = attempts.flatMap(result => result.status === 'fulfilled' ? [result.value] : [])
      assert.ok(concurrent.every(result => 'decision_id' in result))
      const ids = new Set(concurrent.flatMap(result => 'decision_id' in result ? [result.decision_id] : []))
      assert.equal(ids.size, 1)
      decision = concurrent[0]
      assert.equal((await rows(sql`SELECT id FROM optimization_assignment_heads WHERE subject_key=${context.subjectKey} AND scope=${scope}`)).length, 1)
      assert.equal((await rows(sql`SELECT event_id FROM optimization_events WHERE subject_key=${context.subjectKey} AND event_type='ranking_assigned'`)).length, 1)
    })
    if (!decision!) return
    assert.ok('decision_id' in decision!)
    if (!('decision_id' in decision!)) return
    const active = decision!
    const item = active.items[0]!
    const impression = (): Extract<ClientOptimizationEvent, { event_type: 'project_impression' }> => ({ event_id: randomUUID(), event_type: 'project_impression', occurred_at: new Date().toISOString(), region: 'nn', device_class: 'desktop', project_code: item.project_code, placement: 'home.popular_projects', decision_id: active.decision_id, slot_position: item.slot_position, exposure_id: randomUUID() })
    const first = impression()
    const firstBatch = batchFor([first], active.decision_token)
    let exposure: string
    await t.test('real HTTP ingress retries are immutable; another UUID for the same scope does not increase N', async () => {
      const responses = await Promise.all(Array.from({ length: 8 }, () => send(firstBatch)))
      assert.ok(responses.every(response => response.status === 200))
      const bodies = await Promise.all(responses.map(response => response.json()))
      assert.equal(bodies.filter(body => body.results[0].status === 'accepted').length, 1)
      exposure = bodies[0].results[0].exposure_id
      const alternative = await send(batchFor([impression()], active.decision_token))
      assert.equal(alternative.status, 200)
      assert.equal((await alternative.json()).results[0].status, 'duplicate')
      assert.equal((await rows(sql`SELECT id FROM optimization_exposures WHERE decision_id=${active.decision_id}`)).length, 1)
      const conflict = await send(batchFor([{ ...first, device_class: 'mobile' }], active.decision_token))
      assert.equal(conflict.status, 409)
      assert.equal((await conflict.json()).error, 'event_conflict')
    })
    await t.test('foreign owner, forged token, wrong item/region and exposure without impression are refused', async () => {
      assert.equal((await send(firstBatch, { context: createOptimizationCookie(secret) })).status, 403)
      assert.equal((await send({ ...firstBatch, decision_token: active.decision_token + '.forged' })).status, 403)
      assert.equal((await send(batchFor([{ ...impression(), slot_position: 6 }], active.decision_token))).status, 403)
      assert.equal((await send(firstBatch, { region: 'msk' })).status, 409)
      const opened = { ...impression(), event_type: 'project_opened' as const }
      const missing = await send(batchFor([opened], active.decision_token))
      assert.equal(missing.status, 409); assert.equal((await missing.json()).error, 'exposure_required')
    })
    await t.test('valid opened/share facts attach to the exact persisted exposure, direct facts stay unattributed', async () => {
      const opened = { ...impression(), event_type: 'project_opened' as const, exposure_id: exposure! }
      const shared = { ...opened, event_id: randomUUID(), event_type: 'project_shared' as const, share_method: 'copy' as const }
      const direct = { event_id: randomUUID(), event_type: 'project_opened' as const, occurred_at: new Date().toISOString(), region: 'nn' as const, device_class: 'desktop' as const, project_code: item.project_code, placement: 'project.page' as const }
      const result = await send(batchFor([opened, shared, direct], active.decision_token))
      assert.equal(result.status, 200)
      const saved = await rows(sql`SELECT exposure_id FROM optimization_events WHERE event_id IN (${opened.event_id},${shared.event_id},${direct.event_id})`)
      assert.equal(saved.filter(row => row.exposure_id === exposure).length, 2)
      assert.equal(saved.filter(row => row.exposure_id === null).length, 1)
    })
    await t.test('a conflicting event aborts the entire batch, including a newly created exposure', async () => {
      const other = active.items[1]!
      const fresh = { ...impression(), project_code: other.project_code, slot_position: other.slot_position }
      const result = await send(batchFor([fresh, { ...first, device_class: 'tablet' }], active.decision_token))
      assert.equal(result.status, 409)
      assert.equal((await rows(sql`SELECT id FROM optimization_exposures WHERE id=${'exposure_id' in fresh ? fresh.exposure_id : ''}`)).length, 0)
      assert.equal((await rows(sql`SELECT event_id FROM optimization_events WHERE event_id=${fresh.event_id}`)).length, 0)
    })
    await t.test('consent, same-origin, server-only facts, byte limits and protected CMS authentication fail closed', async () => {
      assert.equal((await send(firstBatch, { analytics: false })).status, 403)
      assert.equal((await send(firstBatch, { origin: 'https://forged.invalid' })).status, 403)
      assert.equal((await send(batchFor([{ ...first, event_type: 'project_liked' } as unknown as ClientOptimizationEvent], active.decision_token))).status, 400)
      const tooLarge = await fetch(`${site.origin}/api/optimization/events`, { method: 'POST', headers: { Origin: site.origin, cookie: `${OPTIMIZATION_CONTEXT_COOKIE}=${cookie}; ${CONSENT_COOKIE}=${consent(true)}` }, body: ' '.repeat(32769) })
      assert.equal(tooLarge.status, 413)
      const anonymous = await fetch(`${cms.origin}/api/optimization/events`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      assert.equal(anonymous.status, 401)
      process.env.OPTIMIZATION_EVENTS_ENABLED = 'false'
      assert.equal((await send(firstBatch)).status, 503)
      process.env.OPTIMIZATION_EVENTS_ENABLED = 'true'
    })
    await t.test('assignment expiry and ingestion grace are distinct; late valid facts are accepted within grace only', async () => {
      const now = Date.now()
      const old = await resolveStoredDecision(db, { ...context, sessionKey: 'b'.repeat(64) }, { ...decisionConfig, expiresInMs: 60_000, id: randomUUID() }, authority, select, secret, { now: now - 120_000 })
      assert.ok('decision_token' in old)
      if (!('decision_token' in old)) return
      const token = verifyDecisionToken(old.decision_token, secret, now)!
      assert.ok(token.expires_at < now)
      const tokenTooOld = signDecisionToken({ ...token, expires_at: now - 24 * 3600_000 - 1, assigned_at: now - 24 * 3600_000 - 60_001 }, secret)
      assert.equal(verifyDecisionToken(tokenTooOld, secret, now), null)
      const claimed = { ...impression(), occurred_at: new Date(now + 30_000).toISOString() }
      const wrongTime = await send(batchFor([claimed], active.decision_token))
      assert.equal(wrongTime.status, 200, 'small clock skew remains allowed for current assignments')
    })
    await t.test('authority outage hides even sticky decisions; unpublish invalidates and excludes the old project', async () => {
      const hidden = await resolveStoredDecision(db, context, decisionConfig, async () => ({ status: 'unavailable' }), select, secret)
      assert.deepEqual(hidden, { status: 'hidden', reason: 'catalog_authority_unavailable' })
      const removed = projects[0]!
      await payload.update({ collection: 'projects', id: removed, overrideAccess: true, data: { _status: 'draft' } })
      const replacement = await resolveStoredDecision(db, context, decisionConfig, authority, select, secret)
      assert.ok('decision_id' in replacement)
      if ('decision_id' in replacement) { assert.notEqual(replacement.decision_id, active.decision_id); assert.equal(replacement.items.length, 1) }
      assert.ok((await rows(sql`SELECT invalidated_at FROM optimization_decisions WHERE id=${active.decision_id}`))[0].invalidated_at)
    })
    await t.test('invalid slate/config conflict rolls back and functional-only decisions emit no assignment analytics', async () => {
      const count = (await rows(sql`SELECT count(*) AS n FROM optimization_decisions WHERE subject_key=${context.subjectKey}`))[0].n
      const snapshot = await authority() as Extract<CandidateSnapshot, { status: 'available' }>
      await assert.rejects(resolveStoredDecision(db, { ...context, sessionKey: 'c'.repeat(64) }, decisionConfig, async () => snapshot, () => [{ project_code: 'ZZZZZZ99', slot_position: 1, origin: 'fallback', samplingTrace: {} }], secret))
      await assert.rejects(resolveStoredDecision(db, context, { ...decisionConfig, content: { changed: true } }, authority, select, secret), /Immutable config conflict/)
      assert.equal((await rows(sql`SELECT count(*) AS n FROM optimization_decisions WHERE subject_key=${context.subjectKey}`))[0].n, count)
      const nonlearning = await resolveStoredDecision(db, { ...context, sessionKey: 'd'.repeat(64), analyticsAllowed: false }, decisionConfig, authority, select, secret, { recordAssignment: true })
      assert.ok('decision_id' in nonlearning)
      assert.equal((await rows(sql`SELECT event_id FROM optimization_events WHERE session_key=${'d'.repeat(64)}`)).length, 0)
    })
  } catch (error) { console.error('AO04 integration parent failure', error); throw error } finally {
    await site.close(); await cms.close()
    await db.execute(sql`DELETE FROM optimization_events WHERE subject_key=${context.subjectKey}`)
    await db.execute(sql`DELETE FROM optimization_exposures WHERE decision_id IN (SELECT id FROM optimization_decisions WHERE subject_key=${context.subjectKey})`)
    await db.execute(sql`DELETE FROM optimization_assignment_heads WHERE subject_key=${context.subjectKey}`)
    await db.execute(sql`DELETE FROM optimization_decision_items WHERE decision_id IN (SELECT id FROM optimization_decisions WHERE subject_key=${context.subjectKey})`)
    await db.execute(sql`DELETE FROM optimization_decisions WHERE subject_key=${context.subjectKey}`)
    await db.execute(sql`DELETE FROM optimization_config_versions WHERE config->'content'->>'synthetic'='true'`)
    for (const id of prices) await payload.delete({ collection: 'project-prices', id, overrideAccess: true })
    for (const id of projects) await payload.delete({ collection: 'projects', id, overrideAccess: true })
    await payload.destroy()
    for (const key of Object.keys(process.env)) if (!(key in before)) delete process.env[key]
    Object.assign(process.env, before)
  }
})
