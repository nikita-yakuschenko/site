import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import pg from 'pg'
import { checkRepositoryMigrations, devMarkerDecision, rollbackViolations, upBody } from './migration-policy.mjs'

const Client = pg.Client ?? pg.default?.Client

const lockKey = 8042001
const destructive = /migrate:(fresh|reset|refresh)|migrate:down|\bpayload\s+migrate:(fresh|reset|refresh|down)\b/

function redact(text) {
  return String(text)
    .replace(/postgres(?:ql)?:\/\/\S+/gi, 'postgresql://redacted')
    .replace(/\b(password|token|secret|api[_-]?key)\b\s*[:=]\s*\S+/gi, '$1=redacted')
}

function fail(message) {
  throw new Error(redact(message))
}

function run(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'], env: process.env })
    let output = ''
    const collect = (chunk) => {
      const text = redact(chunk.toString())
      output += text
      process.stdout.write(text)
    }
    child.stdout.on('data', collect)
    child.stderr.on('data', collect)
    child.on('close', (code) => resolve({ code: code ?? 1, output }))
  })
}

const joinedArgs = process.argv.join(' ')
if (destructive.test(joinedArgs) || destructive.test(process.env.npm_lifecycle_event ?? '')) {
  fail('Разрушительные команды миграции в production запрещены.')
}

if (!process.env.DATABASE_URL) fail('DATABASE_URL не передан контейнеру миграции.')
const expectedDatabase = process.env.CMS_EXPECTED_DATABASE || 'main_app'
process.env.CMS_SEED = '0'
process.env.PAYLOAD_DB_PUSH = 'false'
process.env.NODE_ENV = 'production'

const repository = checkRepositoryMigrations()
if (repository.problems.length) fail(repository.problems.join('\n'))

const client = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 })
try {
  await client.connect()
} catch (error) {
  fail(`PostgreSQL недоступен: ${error instanceof Error ? error.message : 'ошибка подключения'}`)
}

try {
  const locked = await client.query('SELECT pg_try_advisory_lock($1) AS ok', [lockKey])
  if (!locked.rows[0]?.ok) fail('Другая миграция этой базы уже выполняется.')

  const identity = await client.query('SELECT current_database() AS database')
  const database = identity.rows[0]?.database
  console.log(`База: ${database}`)
  if (database !== expectedDatabase) fail(`Подключение открыло базу «${database}», ожидается «${expectedDatabase}».`)

  let rows = []
  try {
    const history = await client.query('SELECT name, batch FROM payload_migrations ORDER BY name')
    rows = history.rows
  } catch (error) {
    if (error?.code !== '42P01') throw error
    console.log('Таблицы payload_migrations ещё нет: это пустая база.')
  }

  const decision = devMarkerDecision(rows, repository.names, repository.history)
  if (decision.action !== 'none') {
    fail(`${decision.reason} Обычный релиз маркер не удаляет. Сначала выполните однократный bootstrap.`)
  }

  const applied = new Set(rows.filter((row) => Number(row.batch) !== -1).map((row) => row.name))
  const historical = new Set(repository.exceptions)
  for (const name of repository.names) {
    if (applied.has(name) || historical.has(name)) continue
    const violations = rollbackViolations(upBody(readFileSync(path.join('src', 'migrations', `${name}.ts`), 'utf8')))
    if (violations.length) fail(`Миграция ${name} несовместима с откатом на предыдущий образ (${violations.join('; ')}).`)
  }

  const migrated = await run('npm', ['run', 'migrate', '--silent'])
  if (/would you like to proceed|data loss will occur/i.test(migrated.output)) {
    fail('Payload запросил интерактивное подтверждение и не применил миграцию.')
  }
  if (migrated.code !== 0) fail(`payload migrate завершился с кодом ${migrated.code}.`)

  const after = await client.query('SELECT name, batch FROM payload_migrations')
  const done = new Set(after.rows.filter((row) => Number(row.batch) > 0).map((row) => row.name))
  const missing = repository.names.filter((name) => !done.has(name))
  if (missing.length) fail(`После migrate в истории нет миграций: ${missing.join(', ')}`)
  if (after.rows.some((row) => Number(row.batch) === -1)) fail('Маркер batch=-1 остался после миграции.')
  console.log('История миграций совпадает с файлами репозитория.')

  const drift = await run('node', ['node_modules/tsx/dist/cli.mjs', 'scripts/check-schema-drift.ts'])
  if (drift.code !== 0) fail('Фактическая схема не совпадает с конфигурацией Payload. Образ CMS не переключается.')
  console.log('Миграция проверена.')
} catch (error) {
  console.error(redact(error instanceof Error ? error.message : 'Миграция не выполнена.'))
  process.exitCode = 1
} finally {
  await client.end().catch(() => {})
}
process.exit(process.exitCode ?? 0)
