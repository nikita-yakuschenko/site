import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import test from 'node:test'
import pg from 'pg'
import { drizzle } from '@payloadcms/db-postgres/drizzle/node-postgres'
import { getTableConfig, pgTable, serial, PgDialect } from '@payloadcms/db-postgres/drizzle/pg-core'
import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import type { PayloadRequest } from 'payload'
import { up as foundationUp, down as foundationDown } from '../../src/migrations/20261021_120000_optimization_foundation'
import { up, down } from '../../src/migrations/20261021_130000_project_preferences'
import { preferenceTables } from '../../src/optimization/preference-schema'
import { captureLikeBaseline, preferenceIdentity, readPreferences, setPreference, type PreferenceDatabase } from '../../src/optimization/likes'
import { syncLegacyLikes } from '../../src/optimization/legacy-likes'
import { legacyPreferenceRead, legacyPreferenceWrite, preferenceEndpoints } from '../../src/optimization/likes-endpoints'
import { canonicalReactionSnapshot } from '../../src/optimization/project-reaction-snapshot'
import { projectReactionsWriteEndpoint } from '../../src/collections/project-reactions-endpoint'
import { generateRecordId } from '../../../src/lib/record-id'

const connectionString = process.env.OPTIMIZATION_LIKES_TEST_DATABASE_URL
const secret = 'ao02-integration-only-preferences-secret-32-chars'
test('canonical preferences, reconciliation and concurrency on isolated PostgreSQL', { skip: !connectionString }, async t => {
  const target = new URL(connectionString!)
  assert.ok(['127.0.0.1', 'localhost'].includes(target.hostname))
  assert.equal(target.pathname, '/ao_test_likes')
  const pool = new pg.Pool({ connectionString, max: 8 }), db = drizzle(pool)
  let created = false
  const previous = { enabled: process.env.OPTIMIZATION_ENABLED, preferences: process.env.OPTIMIZATION_PREFERENCES_ENABLED, secret: process.env.OPTIMIZATION_PREFERENCES_SECRET, api: process.env.CMS_SITE_API_KEY }
  t.after(async () => {
    for (const [key, value] of Object.entries({ OPTIMIZATION_ENABLED: previous.enabled, OPTIMIZATION_PREFERENCES_ENABLED: previous.preferences, OPTIMIZATION_PREFERENCES_SECRET: previous.secret, CMS_SITE_API_KEY: previous.api })) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value
    }
    if (created) {
      await down({ db } as unknown as MigrateDownArgs)
      await foundationDown({ db } as unknown as MigrateDownArgs)
      await pool.query('DROP TABLE projects')
    }
    await pool.end()
  })
    assert.equal(Number((await pool.query("SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")).rows[0].count), 0, 'Fixture database must be completely empty')
    await db.transaction(async tx => {
      await tx.execute((await import('@payloadcms/db-postgres')).sql`CREATE TABLE projects(id serial PRIMARY KEY, code varchar(8) UNIQUE NOT NULL, slug text UNIQUE NOT NULL, import_key text UNIQUE, _status text NOT NULL DEFAULT 'published',like_count numeric DEFAULT 0,share_count numeric DEFAULT 0,view_count numeric DEFAULT 0,like_voters jsonb DEFAULT '[]'::jsonb,share_voters jsonb DEFAULT '[]'::jsonb)`)
      await foundationUp({ db: tx } as unknown as MigrateUpArgs)
      await up({ db: tx } as unknown as MigrateUpArgs)
    })
    created = true
    const identity = (digit = 'a', fingerprintKey?: string) => preferenceIdentity(`c:${digit.repeat(32)}`, secret, { analyticsAllowed: true, fingerprintKey })
    const freshInput = (liked: boolean, expected_revision = 0) => ({ liked, operation_id: randomUUID(), expected_revision, source: 'project_card' as const })
    async function project(count = 0, voters: unknown = [], options: { slug?: string; importKey?: string; draft?: boolean; prepare?: boolean } = {}) {
      const code = generateRecordId()
      const row = (await pool.query('INSERT INTO projects(code,slug,import_key,_status,like_count,like_voters) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id', [code, options.slug ?? code.toLowerCase(), options.importKey ?? null, options.draft ? 'draft' : 'published', count, JSON.stringify(voters)])).rows[0]
      if (options.prepare !== false) await captureLikeBaseline(db, code, 'synthetic-v1')
      return { id: Number(row.id), code }
    }
    const count = async (id: number) => Number((await pool.query('SELECT like_count FROM projects WHERE id=$1', [id])).rows[0].like_count)
    const events = async (id: number) => (await pool.query('SELECT event_type,payload FROM optimization_events WHERE project_id=$1 ORDER BY received_at,event_id', [id])).rows

    await t.test('migration down/up and registered columns, constraints and indexes agree', async () => {
      await db.transaction(async tx => { await down({ db: tx } as unknown as MigrateDownArgs); await up({ db: tx } as unknown as MigrateUpArgs) })
      const fixture = pgTable('projects', { id: serial('id').primaryKey() })
      for (const table of Object.values(preferenceTables(fixture.id))) {
        const expected = getTableConfig(table)
        const actual = await pool.query('SELECT a.attname AS name,format_type(a.atttypid,a.atttypmod) AS type,a.attnotnull AS required FROM pg_attribute a WHERE a.attrelid=$1::regclass AND a.attnum>0 AND NOT a.attisdropped ORDER BY a.attname', [expected.name])
        assert.deepEqual(actual.rows, expected.columns.map(c => ({ name: c.name, type: c.getSQLType().replace(/^varchar/, 'character varying').replace(/timestamp\s+\(/, 'timestamp('), required: c.notNull })).sort((a, b) => a.name.localeCompare(b.name)))
        const constraints = new Set((await pool.query('SELECT conname FROM pg_constraint WHERE conrelid=$1::regclass', [expected.name])).rows.map(r => r.conname))
        for (const c of [...expected.checks, ...expected.foreignKeys, ...expected.uniqueConstraints]) {
          const name = 'getName' in c ? c.getName() : c.name
          assert.ok(name && name.length <= 63 && constraints.has(name), `${expected.name}: ${name}`)
        }
        const indexes = new Set((await pool.query('SELECT indexname FROM pg_indexes WHERE tablename=$1', [expected.name])).rows.map(r => r.indexname))
        for (const i of expected.indexes) assert.ok(indexes.has(i.config.name))
      }
    })
    await t.test('preparation CLI defaults to read-only and applies a whole baseline set atomically', async () => {
      const valid = await project(0, [], { prepare: false })
      const invalid = await project(0, [identity().voterKey], { prepare: false })
      const root = fileURLToPath(new URL('../../', import.meta.url))
      const run = (...args: string[]) => execFileSync(process.execPath, [path.join(root, 'node_modules/tsx/dist/cli.mjs'), path.join(root, 'scripts/optimization-prepare-likes.ts'), ...args], {
        cwd: root, encoding: 'utf8', stdio: 'pipe', env: { ...process.env, DATABASE_URL: connectionString!, OPTIMIZATION_ENABLED: 'false', OPTIMIZATION_PREFERENCES_ENABLED: 'false' },
      })
      assert.equal(JSON.parse(run()).mode, 'dry-run')
      assert.throws(() => run('--apply', '--version=synthetic-cli-test'))
      assert.equal(Number((await pool.query('SELECT count(*) FROM project_like_baselines WHERE project_id IN ($1,$2)', [valid.id, invalid.id])).rows[0].count), 0, 'Failed preflight must not freeze a partial catalog')
      await pool.query("UPDATE projects SET like_voters='[]' WHERE id=$1", [invalid.id])
      assert.equal(JSON.parse(run('--apply', '--version=synthetic-cli-test')).prepared, 2)
      assert.equal(JSON.parse(run('--apply', '--version=synthetic-cli-test')).existing, 2)
    })
    await t.test('a set-state retry cannot double count or overwrite a later unlike', async () => {
      const p = await project(), who = identity(), like = freshInput(true)
      const first = await setPreference(db, p.code, who, like)
      assert.equal(first.status, 200)
      assert.equal(await count(p.id), 1)
      assert.deepEqual(await setPreference(db, p.code, who, like), first)
      assert.equal((await setPreference(db, p.code, who, { ...like, liked: false })).status, 409)
      assert.equal((await setPreference(db, p.code, who, freshInput(true, 1))).status, 200)
      assert.equal((await events(p.id)).length, 1, 'No-op is not another like event')
      assert.equal((await events(p.id))[0]?.payload.operation_id, like.operation_id)
      assert.equal((await setPreference(db, p.code, who, freshInput(false, 1))).status, 200)
      assert.equal(await count(p.id), 0)
      assert.deepEqual(await setPreference(db, p.code, who, like), first, 'Replay returns receipt, not a new mutation')
      const [current] = await readPreferences(db, [p.code], who)
      assert.ok(current && 'liked' in current && !current.liked && current.revision === 2)
      assert.equal((await events(p.id)).length, 2)
    })
    await t.test('concurrent same operation is exactly one mutation; independent stale intents get 409', async () => {
      const p = await project(), who = identity(), input = freshInput(true)
      const retries = await Promise.all(Array.from({ length: 12 }, () => setPreference(db, p.code, who, input)))
      assert.ok(retries.every(r => r.status === 200))
      assert.equal(await count(p.id), 1)
      assert.equal((await events(p.id)).length, 1)
      const q = await project()
      const race = await Promise.all([setPreference(db, q.code, who, freshInput(true)), setPreference(db, q.code, who, freshInput(true))])
      assert.deepEqual(race.map(r => r.status).sort(), [200, 409])
      assert.equal(await count(q.id), 1)
      const other = await setPreference(db, q.code, identity('b'), freshInput(true))
      assert.equal(other.status, 200)
      assert.equal(await count(q.id), 2)
    })
    await t.test('legacy cookie plus local favorite consumes one historic credit and produces no imported reward', async () => {
      const who = identity(), fingerprint = `f:${'b'.repeat(64)}`
      const p = await project(1, [who.voterKey, fingerprint])
      const [legacy] = await readPreferences(db, [p.code], who)
      assert.ok(legacy && 'liked' in legacy && legacy.liked && legacy.revision === 0)
      const migration = { migration_id: randomUUID(), legacy_ids: [p.code] }
      const result = await syncLegacyLikes(db, who, migration)
      assert.equal(result.status, 200)
      assert.deepEqual(await syncLegacyLikes(db, who, migration), result)
      assert.equal(await count(p.id), 1)
      assert.equal((await events(p.id)).length, 0)
      assert.equal((await setPreference(db, p.code, who, freshInput(false))).status, 200)
      assert.equal(await count(p.id), 0)
      assert.equal((await setPreference(db, p.code, who, freshInput(true, 1))).status, 200)
      assert.equal(await count(p.id), 1)
      assert.equal((await setPreference(db, p.code, who, freshInput(false, 2))).status, 200)
      await syncLegacyLikes(db, who, { ...migration, migration_id: randomUUID() })
      assert.equal(await count(p.id), 0, 'Stale import cannot resurrect unlike')
      assert.equal(Number((await pool.query('SELECT count(*) FROM project_like_legacy_claims WHERE project_id=$1', [p.id])).rows[0].count), 1)
      const voters = (await pool.query('SELECT like_voters FROM projects WHERE id=$1', [p.id])).rows[0].like_voters
      assert.deepEqual(voters, [fingerprint], 'Never infer which fingerprint belongs to a cookie')
    })
    await t.test('ambiguous fingerprint and historic local-only imports remain pending, not inflated', async () => {
      const fingerprint = `f:${'c'.repeat(64)}`, p = await project(1, [fingerprint])
      const result = await setPreference(db, p.code, identity('d', fingerprint), freshInput(true))
      assert.ok('liked' in result.body && result.body.liked && result.body.reconciliation === 'pending')
      assert.equal(await count(p.id), 1)
      const q = await project(10)
      const sync = await syncLegacyLikes(db, identity(), { migration_id: randomUUID(), legacy_ids: [q.code] })
      assert.ok('items' in sync.body && sync.body.items[0]?.state?.reconciliation === 'pending')
      assert.equal(await count(q.id), 10)
      assert.equal((await events(q.id)).length, 0)
    })
    await t.test('legacy ID aliases resolve once; ambiguous/draft/referral identifiers never count as projects', async () => {
      const p = await project(), slug = (await pool.query('SELECT slug FROM projects WHERE id=$1', [p.id])).rows[0].slug
      const batch = { migration_id: randomUUID(), legacy_ids: [p.code, `cms:${p.id}`, slug, 'referral:legacy'] }
      const result = await syncLegacyLikes(db, identity(), batch)
      assert.equal(result.status, 200)
      assert.equal(await count(p.id), 1)
      assert.equal((await events(p.id)).length, 0)
      assert.equal((await syncLegacyLikes(db, identity(), { ...batch, legacy_ids: ['unknown'] })).status, 409)
      const sharedSlug = `ambiguous-${randomUUID()}`
      await project(0, [], { slug: sharedSlug })
      await project(0, [], { importKey: `catalog:${sharedSlug}` })
      const draft = await project(0, [], { draft: true })
      const unresolved = await syncLegacyLikes(db, identity(), { migration_id: randomUUID(), legacy_ids: [sharedSlug, draft.code] })
      assert.ok('items' in unresolved.body && unresolved.body.items[0]?.result === 'ambiguous' && unresolved.body.items[1]?.result === 'unavailable')
      assert.equal((await setPreference(db, draft.code, identity(), freshInput(true))).status, 404)
    })
    await t.test('missing, invalid or changed baseline blocks cutover instead of guessing counts', async () => {
      const p = await project(0, [], { prepare: false })
      assert.equal((await setPreference(db, p.code, identity(), freshInput(true))).status, 409)
      await captureLikeBaseline(db, p.code, 'synthetic-v1')
      await pool.query('UPDATE projects SET like_count=5 WHERE id=$1', [p.id])
      const changed = await setPreference(db, p.code, identity(), freshInput(true))
      assert.deepEqual(changed.body, { error: 'baseline_changed' })
      const invalid = await project(0, [identity().voterKey], { prepare: false })
      await assert.rejects(captureLikeBaseline(db, invalid.code, 'synthetic-v1'), /reconciliation/)
    })
    await t.test('event failure rolls back preference, count and operation receipt together', async () => {
      const p = await project(), dialect = new PgDialect()
      const failing: PreferenceDatabase = { execute: db.execute.bind(db), transaction: work => db.transaction(tx => work({ execute: async query => {
        if (dialect.sqlToQuery(query).sql.includes('INSERT INTO optimization_events')) throw new Error('synthetic outbox failure')
        return tx.execute(query)
      } })) }
      const mutation = freshInput(true)
      await assert.rejects(setPreference(failing, p.code, identity(), mutation), /synthetic outbox/)
      assert.equal(await count(p.id), 0)
      assert.equal(Number((await pool.query('SELECT count(*) FROM project_likes WHERE project_id=$1', [p.id])).rows[0].count), 0)
      assert.equal(Number((await pool.query('SELECT count(*) FROM project_like_operations WHERE operation_id=$1', [mutation.operation_id])).rows[0].count), 0)
    })
    await t.test('baseline capture racing old writes cannot leave a post-cutover raw increment', async () => {
      process.env.OPTIMIZATION_ENABLED = 'false'
      process.env.OPTIMIZATION_PREFERENCES_ENABLED = 'false'
      process.env.CMS_SITE_API_KEY = 'ao02-local-test-api-key-with-32-characters'
      const p = await project(0, [], { prepare: false })
      const slug = (await pool.query('SELECT slug FROM projects WHERE id=$1', [p.id])).rows[0].slug
      const writes = Array.from({ length: 8 }, (_, i) => {
        const req = { url: 'http://cms.test/api/projects/reactions', headers: new Headers({ Authorization: `Bearer ${process.env.CMS_SITE_API_KEY}` }), json: async () => ({ slug, action: 'like', keys: [`c:${String(i).repeat(32)}`] }), payload: { db: { drizzle: db } } } as unknown as PayloadRequest
        return projectReactionsWriteEndpoint.handler(req)
      })
      const [responses] = await Promise.all([Promise.all(writes), captureLikeBaseline(db, p.code, 'race-v1')])
      assert.ok(responses.every(r => r.status === 200 || r.status === 503))
      const result = await setPreference(db, p.code, identity('e'), freshInput(true))
      assert.equal(result.status, 200, 'A captured baseline must still match after all in-flight legacy writes finish')
    })
    await t.test('legacy adapter shares one writer and disabling it never reverts to raw increments', async () => {
      process.env.OPTIMIZATION_ENABLED = 'true'; process.env.OPTIMIZATION_PREFERENCES_ENABLED = 'true'; process.env.OPTIMIZATION_PREFERENCES_SECRET = secret
      const p = await project(), who = identity()
      await setPreference(db, p.code, who, freshInput(true))
      const slug = (await pool.query('SELECT slug FROM projects WHERE id=$1', [p.id])).rows[0].slug
      const req = { payload: { db: { drizzle: db } } } as unknown as PayloadRequest
      const response = await legacyPreferenceWrite(req, slug, 'like', [who.voterKey])
      assert.equal(response?.status, 200)
      assert.equal(await count(p.id), 1)
      assert.equal((await (await legacyPreferenceRead(req, slug, who.voterKey))!.json()).liked, true)
      process.env.OPTIMIZATION_PREFERENCES_ENABLED = 'false'
      assert.equal((await legacyPreferenceWrite(req, slug, 'unlike', [who.voterKey]))?.status, 503)
      assert.equal(await count(p.id), 1)
    })
    await t.test('editor snapshot requires the Payload transaction and reads canonical counts under lock', async () => {
      const p = await project(), who = identity()
      await setPreference(db, p.code, who, freshInput(true))
      const noTx = { payload: { db: { drizzle: db } } } as unknown as PayloadRequest
      await assert.rejects(canonicalReactionSnapshot(noTx, p.id), /require a transaction/)
      await db.transaction(async tx => {
        const req = { transactionID: Promise.resolve('test'), payload: { db: { drizzle: db, sessions: { test: { db: tx } } } } } as unknown as PayloadRequest
        assert.equal(Number((await canonicalReactionSnapshot(req, p.id))?.like_count), 1)
      })
    })
    await t.test('protected CMS batch, set, list and sync endpoints use canonical state and hide unpublished projects', async () => {
      process.env.OPTIMIZATION_ENABLED = 'true'; process.env.OPTIMIZATION_PREFERENCES_ENABLED = 'true'; process.env.OPTIMIZATION_PREFERENCES_SECRET = secret
      process.env.CMS_SITE_API_KEY = 'ao02-local-test-api-key-with-32-characters'
      const p = await project(), who = identity('f')
      const call = async (action: string, data: Record<string, unknown>) => {
        const req = { headers: new Headers({ Authorization: `Bearer ${process.env.CMS_SITE_API_KEY}` }), json: async () => ({ voter_key: who.voterKey, region: 'nn', analytics_allowed: false, ...data }), payload: { db: { drizzle: db } } } as unknown as PayloadRequest
        return preferenceEndpoints.find(e => e.path.endsWith(`/${action}`))!.handler(req)
      }
      const set = await call('set', { project_code: p.code, mutation: freshInput(true) })
      assert.equal(set.status, 200)
      assert.equal((await set.json()).likeCount, 1)
      assert.equal((await (await call('batch', { codes: [p.code] })).json()).items[0].liked, true)
      assert.ok((await (await call('list', {})).json()).items.some((item: { project_code: string }) => item.project_code === p.code))
      const sync = await call('sync', { migration: { migration_id: randomUUID(), legacy_ids: [`cms:${p.id}`, 'cms:9999999999'] } })
      assert.equal(sync.status, 200)
      assert.equal((await sync.json()).items[1].result, 'unknown')
      await pool.query("UPDATE projects SET _status='draft' WHERE id=$1", [p.id])
      assert.deepEqual((await (await call('batch', { codes: [p.code] })).json()).items, [{ project_code: p.code, unavailable: true }])
      assert.equal((await call('set', { project_code: p.code, mutation: freshInput(false, 1) })).status, 404)
      assert.equal((await events(p.id)).length, 0, 'No analytics consent means no server analytics event')
    })
})
