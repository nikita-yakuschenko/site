import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import test from 'node:test'
import pg from 'pg'
import { drizzle } from '@payloadcms/db-postgres/drizzle/node-postgres'
import { getTableConfig, pgTable, serial } from '@payloadcms/db-postgres/drizzle/pg-core'
import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { up, down } from '../../src/migrations/20261021_120000_optimization_foundation'
import { appendAuthorizedClientEvent, eventPayloadHash } from '../../src/optimization/repository'
import { optimizationTables } from '../../src/optimization/schema'
import type { ClientOptimizationEvent } from '../../../src/lib/optimization/contracts'

// Never fall back to DATABASE_URL. Explicit, local, disposable database only.
const connectionString = process.env.OPTIMIZATION_TEST_DATABASE_URL
test('optimization migration, constraints, append-only retries and rollback on disposable PostgreSQL', { skip: !connectionString }, async () => {
  const target = new URL(connectionString!)
  assert.ok(['127.0.0.1', 'localhost'].includes(target.hostname))
  assert.match(target.pathname, /^\/ao_(?:test_|foundation$)/)
  const client = new pg.Client({ connectionString })
  await client.connect()
  try {
    await client.query('BEGIN')
    const db = drizzle(client)
    const existing = await client.query("SELECT to_regclass('public.optimization_config_versions') AS name")
    if (!existing.rows[0].name) {
      const tables = await client.query("SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='public'")
      assert.equal(tables.rows[0].n, 0, 'Unmigrated fixture database must be completely empty')
      await client.query('CREATE TABLE projects (id serial PRIMARY KEY)')
      await up({ db } as unknown as MigrateUpArgs)
    }
    const count = await client.query('SELECT count(*)::int AS n FROM optimization_config_versions')
    assert.equal(count.rows[0].n, 0, 'Use an empty disposable migrated database')
    await down({ db } as unknown as MigrateDownArgs)
    await up({ db } as unknown as MigrateUpArgs)
    const projectFixture = pgTable('projects', { id: serial('id').primaryKey() })
    for (const table of Object.values(optimizationTables(projectFixture.id))) {
      const expected = getTableConfig(table)
      const columns = await client.query(`SELECT a.attname AS name, format_type(a.atttypid,a.atttypmod) AS type, a.attnotnull AS required FROM pg_attribute a WHERE a.attrelid=$1::regclass AND a.attnum>0 AND NOT a.attisdropped ORDER BY a.attname`, [expected.name])
      const expectedColumns = expected.columns.map(column => ({ name: column.name, type: column.getSQLType().replace(/^varchar/, 'character varying').replace(/timestamp\s+\(/, 'timestamp('), required: column.notNull })).sort((a, b) => a.name.localeCompare(b.name))
      assert.deepEqual(columns.rows, expectedColumns, `${expected.name}: migrated columns match registered schema`)
      const constraints = await client.query('SELECT conname FROM pg_constraint WHERE conrelid=$1::regclass', [expected.name])
      const names = new Set(constraints.rows.map(row => row.conname))
      for (const constraint of [...expected.checks, ...expected.foreignKeys, ...expected.uniqueConstraints, ...expected.primaryKeys]) {
        const name = 'getName' in constraint ? constraint.getName() : constraint.name
        assert.ok(name && name.length <= 63 && names.has(name), `${expected.name}: constraint ${name} exists without truncation`)
      }
      const indexes = await client.query('SELECT indexname FROM pg_indexes WHERE tablename=$1', [expected.name])
      const indexNames = new Set(indexes.rows.map(row => row.indexname))
      for (const idx of expected.indexes) assert.ok(indexNames.has(idx.config.name), `${expected.name}: index ${idx.config.name}`)
    }
    const config = randomUUID(), decision = randomUUID(), exposure = randomUUID()
    await client.query('INSERT INTO optimization_config_versions(id,content_hash,config) VALUES ($1,$2,$3)', [config, '0'.repeat(64), '{}'])
    await client.query(`INSERT INTO optimization_decisions(id,region,mode,config_version,policy_version,model_version,candidate_set_hash,candidate_snapshot,assigned_at,expires_at)
      VALUES ($1,'nn','hybrid',$2,'cold-start-v1','untrained-v1',$3,'[]',now(),now()+interval '1 hour')`, [decision, config, '0'.repeat(64)])
    await client.query(`INSERT INTO optimization_decision_items(decision_id,project_code,slot_position,origin,sampling_trace) VALUES ($1,'AB12CDEF',1,'exploration','{}')`, [decision])
    async function rejected(query: string, params: unknown[], code: string) {
      await client.query('SAVEPOINT invalid_input')
      await assert.rejects(client.query(query, params), (error: unknown) => (error as { code?: string }).code === code)
      await client.query('ROLLBACK TO SAVEPOINT invalid_input')
    }
    await rejected(`INSERT INTO optimization_decision_items(decision_id,project_code,slot_position,origin,sampling_trace) VALUES ($1,'CD34EFGH',1,'exploration','{}')`, [decision], '23505')
    await rejected(`INSERT INTO optimization_decision_items(decision_id,project_code,slot_position,origin,sampling_trace) VALUES ($1,'AB12CDEF',2,'exploration','{}')`, [decision], '23505')
    await rejected(`INSERT INTO optimization_decision_items(decision_id,project_code,slot_position,origin,sampling_trace) VALUES ($1,'CD34EFGH',7,'exploration','{}')`, [decision], '23514')
    const exposureInsert = `INSERT INTO optimization_exposures(id,decision_id,project_code,position,scope_key,region,visible_at,visibility_rule_version) VALUES ($1,$2,$3,$4,'session-a','nn',now(),'visible-50-1000-v1')`
    await rejected(exposureInsert, [randomUUID(), decision, 'CD34EFGH', 1], '23503')
    await client.query(exposureInsert, [exposure, decision, 'AB12CDEF', 1])
    await rejected(exposureInsert, [randomUUID(), decision, 'AB12CDEF', 1], '23505')
    const event: ClientOptimizationEvent = { event_type: 'project_impression', event_id: randomUUID(), occurred_at: new Date().toISOString(), region: 'nn', device_class: 'mobile', placement: 'home.popular_projects', project_code: 'AB12CDEF', decision_id: decision, exposure_id: exposure, slot_position: 1 }
    const context = { subjectKey: 'test-subject', sessionKey: 'test-session', projectId: null }
    assert.equal(await appendAuthorizedClientEvent(db, event, context), 'accepted')
    assert.equal(await appendAuthorizedClientEvent(db, event, context), 'duplicate')
    const reordered = Object.fromEntries(Object.entries(event).reverse()) as ClientOptimizationEvent
    assert.equal(eventPayloadHash(reordered, context), eventPayloadHash(event, context))
    assert.equal(await appendAuthorizedClientEvent(db, { ...event, device_class: 'desktop' }, context), 'conflict')
    assert.equal(await appendAuthorizedClientEvent(db, event, { ...context, subjectKey: 'other-subject' }), 'conflict')
    const facts = await client.query('SELECT payload FROM optimization_events')
    assert.equal(facts.rowCount, 1)
    assert.equal(facts.rows[0].payload.device_class, 'mobile', 'Conflicting retry must not overwrite the fact')
    const longNames = await client.query(`SELECT conname FROM pg_constraint WHERE conrelid IN (SELECT oid FROM pg_class WHERE relname LIKE 'optimization_%') AND length(conname)>63`)
    assert.equal(longNames.rowCount, 0)
  } finally {
    await client.query('ROLLBACK')
    await client.end()
  }
})
