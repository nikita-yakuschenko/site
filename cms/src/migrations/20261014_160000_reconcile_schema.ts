import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'
import { up as initialUp } from './20261014_074208_initial_record_ids'

type Db = MigrateUpArgs['db']
type Rows<T> = { rows: T[] }

// Production was created by push with serial ids, and the initial migration was only marked as applied.
// Replays its schema additively: missing types, enum values, tables, columns, foreign keys and indexes. Nothing is dropped.

// Collects the SQL statements of the initial migration without executing them.
async function initialStatements(db: Db): Promise<string[]> {
  const dialect = (db as unknown as { dialect: { sqlToQuery: (query: unknown) => { sql: string } } }).dialect
  const captured: string[] = []
  const recorder = { execute: async (query: unknown) => { captured.push(dialect.sqlToQuery(query).sql) } }
  await initialUp({ db: recorder, payload: { create: async () => ({}) }, req: {} } as unknown as MigrateUpArgs)
  return captured.join('\n').split(/;\s*(?:\n|$)/).map(statement => statement.trim()).filter(Boolean)
}

async function query<T>(db: Db, statement: ReturnType<typeof sql>): Promise<T[]> {
  return ((await db.execute(statement)) as unknown as Rows<T>).rows
}

async function columnType(db: Db, table: string, column: string): Promise<string | null> {
  const rows = await query<{ typ: string }>(db, sql`
    select format_type(a.atttypid, a.atttypmod) as typ from pg_attribute a
    join pg_class c on c.oid = a.attrelid join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = ${table} and a.attname = ${column} and a.attnum > 0 and not a.attisdropped`)
  return rows[0]?.typ ?? null
}

export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  const log = (message: string) => payload.logger.info(`reconcile: ${message}`)
  const createdTables = new Set<string>()
  const addedColumns = new Set<string>()
  const failures: string[] = []

  // Runs one statement inside a savepoint so an optional failure does not abort the whole migration.
  async function attempt(label: string, statement: string, critical: boolean) {
    await db.execute(sql.raw('SAVEPOINT reconcile_step'))
    try {
      await db.execute(sql.raw(statement))
      await db.execute(sql.raw('RELEASE SAVEPOINT reconcile_step'))
      log(label)
      return true
    } catch (error) {
      await db.execute(sql.raw('ROLLBACK TO SAVEPOINT reconcile_step'))
      const message = `${label}: ${error instanceof Error ? (error.cause instanceof Error ? error.cause.message : error.message) : String(error)}`
      payload.logger.warn(`reconcile skipped ${message}`)
      if (critical) failures.push(message)
      return false
    }
  }

  const tableExists = async (table: string) => (await query(db, sql`select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = ${table}`)).length > 0
  const statements = await initialStatements(db)
  const fkTargets = new Map<string, { table: string; column: string }>()
  for (const statement of statements) {
    const fkMatch = statement.match(/^ALTER TABLE "([^"]+)" ADD CONSTRAINT "[^"]+" FOREIGN KEY \("([^"]+)"\) REFERENCES "public"\."([^"]+)"\("([^"]+)"\)/)
    if (fkMatch) fkTargets.set(`${fkMatch[1]}.${fkMatch[2]}`, { table: fkMatch[3], column: fkMatch[4] })
  }

  for (const statement of statements) {
    // Enum types: create, or append missing values.
    const enumMatch = statement.match(/^CREATE TYPE "public"\."([^"]+)" AS ENUM\((.*)\)$/s)
    if (enumMatch) {
      const [, name, list] = enumMatch
      const existing = await query<{ label: string }>(db, sql`select e.enumlabel as label from pg_enum e join pg_type t on t.oid = e.enumtypid where t.typname = ${name}`)
      const typeExists = existing.length > 0 || (await query(db, sql`select 1 from pg_type where typname = ${name}`)).length > 0
      if (!typeExists) { await attempt(`type ${name}`, statement, true); continue }
      const labels = new Set(existing.map(row => row.label))
      for (const [, value] of list.matchAll(/'((?:[^']|'')*)'/g)) {
        if (!labels.has(value.replace(/''/g, "'"))) await attempt(`enum ${name} += ${value}`, `ALTER TYPE "public"."${name}" ADD VALUE IF NOT EXISTS '${value}'`, true)
      }
      continue
    }

    // Tables: create when absent, otherwise add missing columns as nullable.
    const tableMatch = statement.match(/^CREATE TABLE "([^"]+)" \((.*)\)$/s)
    if (tableMatch) {
      const [, table, body] = tableMatch
      if (!(await tableExists(table))) {
        let create = statement
        for (const [key, ref] of fkTargets) {
          if (!key.startsWith(`${table}.`)) continue
          const column = key.slice(table.length + 1)
          const refType = await columnType(db, ref.table, ref.column)
          if (refType) create = create.replace(`"${column}" varchar`, `"${column}" ${refType}`)
        }
        if (await attempt(`table ${table}`, create, true)) createdTables.add(table)
        continue
      }
      for (const line of body.split('\n').map(part => part.trim().replace(/,$/, '')).filter(part => part.startsWith('"'))) {
        const column = line.match(/^"([^"]+)"/)![1]
        const isPk = /\bPRIMARY KEY\b/i.test(line)
        if (await columnType(db, table, column)) {
          if (!isPk && !/\bNOT NULL\b/i.test(line)) {
            await attempt(`nullable ${table}.${column}`, `ALTER TABLE "${table}" ALTER COLUMN "${column}" DROP NOT NULL`, false)
          }
          continue
        }
        const definition = line.replace(/\s+PRIMARY KEY/i, '').replace(/\s+NOT NULL/gi, '')
        if (await attempt(`column ${table}.${column}`, `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS ${definition}`, true)) {
          addedColumns.add(`${table}.${column}`)
          if (column === '_status') await attempt(`backfill ${table}._status`, `UPDATE "${table}" SET "_status" = 'published'`, true)
        }
      }
      continue
    }

    // Foreign keys: align the referencing column type when it holds no data, then add the constraint.
    const fkMatch = statement.match(/^ALTER TABLE "([^"]+)" ADD CONSTRAINT "([^"]+)" FOREIGN KEY \("([^"]+)"\) REFERENCES "public"\."([^"]+)"\("([^"]+)"\)/)
    if (fkMatch) {
      const [, table, constraint, column, refTable, refColumn] = fkMatch
      if ((await query(db, sql`select 1 from pg_constraint where conname = ${constraint.slice(0, 63)}`)).length) continue
      const [type, refType] = [await columnType(db, table, column), await columnType(db, refTable, refColumn)]
      if (!type || !refType) { await attempt(`fk ${constraint}`, statement, false); continue }
      if (type !== refType) {
        const filled = await query<{ n: number }>(db, sql.raw(`select count(*)::int as n from "${table}" where "${column}" is not null`))
        const safe = createdTables.has(table) || addedColumns.has(`${table}.${column}`) || filled[0].n === 0
        if (!safe) { payload.logger.warn(`reconcile skipped fk ${constraint}: ${table}.${column} ${type} has data, ${refTable}.${refColumn} is ${refType}`); continue }
        await attempt(`type ${table}.${column} ${type} -> ${refType}`, `ALTER TABLE "${table}" ALTER COLUMN "${column}" TYPE ${refType} USING "${column}"::text::${refType}`, false)
      }
      await attempt(`fk ${constraint}`, statement, false)
      continue
    }

    // Indexes are optional for correctness.
    const indexMatch = statement.match(/^CREATE (UNIQUE )?INDEX "([^"]+)"(.*)$/s)
    if (indexMatch) {
      const [, unique = '', name, rest] = indexMatch
      if ((await query(db, sql`select 1 from pg_class where relname = ${name.slice(0, 63)}`)).length) continue
      await attempt(`index ${name}`, `CREATE ${unique}INDEX IF NOT EXISTS "${name}"${rest}`, false)
      continue
    }

    payload.logger.warn(`reconcile ignored statement: ${statement.slice(0, 80)}`)
  }

  if (failures.length) throw new Error(`reconcile failed: ${failures.join('; ')}`)
  log(`done, tables +${createdTables.size}, columns +${addedColumns.size}`)
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // Additive reconciliation of a live database; reverting it could destroy production data.
}
