import { readFileSync } from 'node:fs'
import path from 'node:path'
import pg from 'pg'
import { checkRepositoryMigrations, devMarkerDecision, rollbackViolations, upBody } from './migration-policy.mjs'

const Client = pg.Client ?? pg.default?.Client
const apply = process.env.CMS_BOOTSTRAP_APPLY === '1'
let exitCode = 0

function redact(text) {
  return String(text).replace(/postgres(?:ql)?:\/\/\S+/gi, 'postgresql://redacted')
}

function fail(message) {
  console.error(redact(message))
  process.exit(1)
}

function declaredColumns(sql) {
  return [...sql.matchAll(/alter table\s+"?([\w.]+)"?\s+add column\s+(?:if not exists\s+)?"?([\w]+)"?/gi)]
    .map((match) => ({ table: match[1].replace(/"/g, '').split('.').pop(), column: match[2] }))
}

if (!process.env.DATABASE_URL) fail('DATABASE_URL не передан.')
const expectedDatabase = process.env.CMS_EXPECTED_DATABASE || 'main_app'
const repository = checkRepositoryMigrations()
if (repository.problems.length) fail(repository.problems.join('\n'))

const client = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 })
await client.connect()
try {
  const identity = await client.query('SELECT current_database() AS database')
  const database = identity.rows[0]?.database
  console.log(`База: ${database}`)
  if (database !== expectedDatabase) fail(`Открыта база «${database}», ожидается «${expectedDatabase}».`)

  let rows = []
  try {
    const history = await client.query('SELECT name, batch FROM payload_migrations ORDER BY batch, name')
    rows = history.rows
  } catch (error) {
    if (error?.code !== '42P01') throw error
    console.log('Таблицы payload_migrations нет.')
  }

  console.log('История payload_migrations:')
  if (!rows.length) console.log('- записей нет')
  for (const row of rows) console.log(`- ${row.name} batch=${row.batch}`)

  const applied = new Set(rows.filter((row) => Number(row.batch) !== -1).map((row) => row.name))
  const pending = repository.names.filter((name) => !applied.has(name))
  console.log(pending.length ? `Ещё не применены: ${pending.join(', ')}` : 'Все файлы репозитория уже записаны в историю.')

  const historical = new Set(repository.exceptions)
  const expected = []
  for (const name of pending) {
    const body = upBody(readFileSync(path.join('src', 'migrations', `${name}.ts`), 'utf8'))
    if (!historical.has(name)) {
      const violations = rollbackViolations(body)
      if (violations.length) fail(`${name} нельзя будет применить автоматическим релизом: ${violations.join('; ')}`)
    }
    expected.push(...declaredColumns(body))
  }

  if (expected.length) {
    const present = await client.query(
      `SELECT table_name, column_name, is_nullable, column_default
       FROM information_schema.columns
       WHERE table_schema = 'public' AND (table_name, column_name) IN (${expected.map((_, index) => `($${index * 2 + 1}, $${index * 2 + 2})`).join(', ')})`,
      expected.flatMap((item) => [item.table, item.column]),
    )
    const found = new Set(present.rows.map((row) => `${row.table_name}.${row.column_name}`))
    console.log('Фактические колонки ещё не применённых миграций:')
    for (const item of expected) {
      const key = `${item.table}.${item.column}`
      const row = present.rows.find((entry) => entry.table_name === item.table && entry.column_name === item.column)
      console.log(found.has(key)
        ? `- ${key} уже есть, nullable=${row.is_nullable}, default=${row.column_default ?? 'нет'}`
        : `- ${key} отсутствует`)
    }
  }

  const decision = devMarkerDecision(rows, repository.names)
  console.log(decision.reason)
  if (!apply) {
    console.log(decision.action === 'remove-marker'
      ? 'Диагностика завершена. Маркер снимается только командой bootstrap --apply. Миграции при этом не запускаются.'
      : 'Диагностика завершена. Изменения не вносились.')
    exitCode = decision.action === 'blocked' ? 2 : 0
  } else if (decision.action !== 'remove-marker') {
    fail('Снимать маркер нельзя. База не изменена.')
  } else {

  await client.query('BEGIN')
  const removed = await client.query("DELETE FROM payload_migrations WHERE batch = -1 AND name = 'dev'")
  if (removed.rowCount !== 1) {
    await client.query('ROLLBACK')
    fail('Ожидалась ровно одна запись dev. Удаление отменено.')
  }
  const left = await client.query('SELECT count(*)::int AS count FROM payload_migrations WHERE batch = -1')
  if (left.rows[0]?.count !== 0) {
    await client.query('ROLLBACK')
    fail('Маркер batch=-1 остался. Удаление отменено.')
  }
  await client.query('COMMIT')
  console.log('Удалена одна запись dev с batch=-1. Таблицы данных и остальные миграции не изменялись.')
  }
} catch (error) {
  await client.query('ROLLBACK').catch(() => {})
  fail(error instanceof Error ? error.message : 'Диагностика не выполнена.')
} finally {
  await client.end().catch(() => {})
}
process.exit(exitCode)
