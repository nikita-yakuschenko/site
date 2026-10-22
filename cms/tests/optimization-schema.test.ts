import assert from 'node:assert/strict'
import test from 'node:test'
import { pgTable, serial } from '@payloadcms/db-postgres/drizzle/pg-core'
import { registerOptimizationSchema } from '../src/optimization/schema'

test('owned tables join the Payload runtime schema without replacing existing definitions', async () => {
  const projects = pgTable('projects', { id: serial('id').primaryKey() })
  const schema = { tables: { projects }, enums: {}, relations: {} }
  const args = { schema } as unknown as Parameters<typeof registerOptimizationSchema>[0]
  const registered = await registerOptimizationSchema(args)
  assert.equal(registered.tables.projects, projects)
  assert.equal(registered.enums, schema.enums)
  assert.equal(Object.keys(registered.tables).filter(key => key.startsWith('optimization_')).length, 6)
  assert.equal(Object.keys(registered.tables).filter(key => key.startsWith('project_like')).length, 5)
  assert.equal(Object.keys(schema.tables).length, 1, 'Do not mutate the supplied schema')
  assert.throws(() => registerOptimizationSchema({ schema: registered } as Parameters<typeof registerOptimizationSchema>[0]), /already registered/)
  assert.throws(() => registerOptimizationSchema({ schema: { tables: {}, enums: {}, relations: {} } } as Parameters<typeof registerOptimizationSchema>[0]), /projects.id/)
})
