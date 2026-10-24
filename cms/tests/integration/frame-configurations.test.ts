import assert from 'node:assert/strict'
import { test } from 'node:test'
import { randomUUID } from 'node:crypto'
import { getPayload, createLocalReq } from 'payload'
import { sql, type MigrateUpArgs } from '@payloadcms/db-postgres'
import { up, down } from '../../src/migrations/20261024_220000_frame_configurations'

test('frame upgrade preserves every panel/modular row and seeds only the independent frame group', { skip: process.env.CMS_FRAME_CONFIG_TEST_DATABASE !== 'true', timeout: 120000 }, async () => {
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(process.env.DATABASE_URL!).hostname))
  process.env.CMS_MAINTENANCE = '1'
  const { default: config } = await import('../../src/payload.config')
  const p = await getPayload({ config }), rollback = new Error('Rollback isolated migration test')
  const adapter = p.db as unknown as { drizzle: { transaction: (run: (db: MigrateUpArgs['db']) => Promise<void>) => Promise<void> } }
  try {
    await assert.rejects(adapter.drizzle.transaction(async db => {
      let row = (await db.execute(sql`SELECT id FROM blocks WHERE key='ProjectConfig'`)).rows[0] as { id: number } | undefined
      if (!row) row = (await db.execute(sql`INSERT INTO blocks(title,key,source) VALUES('Комплектации','ProjectConfig','src/components/project-config.tsx') RETURNING id`)).rows[0] as { id: number }
      for (const table of ['cfg_p_start_inc', 'cfg_m_standard_inc']) await db.execute(sql`INSERT INTO ${sql.identifier(table)} ("_order", "_parent_id", id, text) VALUES(987,${row.id},${randomUUID()},'Существующий состав — сохранить')`)
      const snapshot = async () => {
        const tables = (await db.execute(sql`SELECT tablename FROM pg_tables WHERE schemaname='public' AND (tablename LIKE 'cfg_p_%' OR tablename LIKE 'cfg_m_%') ORDER BY tablename`)).rows as { tablename: string }[]
        const values: Record<string, unknown> = {}
        for (const table of tables) values[table.tablename] = (await db.execute(sql`SELECT * FROM ${sql.identifier(table.tablename)} ORDER BY id`)).rows
        values.leads = (await db.execute(sql`SELECT configuration_templates_panel_start_lead,configuration_templates_panel_standard_lead,configuration_templates_panel_project_lead,configuration_templates_modular_standard_lead,configuration_templates_modular_project_lead,configuration_templates_modular_turnkey_lead FROM blocks ORDER BY id`)).rows
        return values
      }
      const before = await snapshot()
      const args = { db, payload: p, req: await createLocalReq({}, p) }
      await down(args)
      await up(args)
      assert.deepEqual(await snapshot(), before)
      assert.equal((await db.execute(sql`SELECT text FROM cfg_f_start_inc WHERE "_parent_id"=${row.id} ORDER BY "_order"`)).rows[0].text, 'Силовой (несущий) каркас')
      assert.equal((await db.execute(sql`SELECT count(*)::integer AS count FROM cfg_f_standard_inc WHERE "_parent_id"=${row.id}`)).rows[0].count, 4)
      assert.equal((await db.execute(sql`SELECT count(*)::integer AS count FROM cfg_f_project_gift WHERE "_parent_id"=${row.id}`)).rows[0].count, 0)
      throw rollback
    }), error => error === rollback)
  } finally { await p.destroy() }
})
