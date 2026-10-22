import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const migrationsDir = path.join(root, 'src', 'migrations')

export function migrationNames(indexSource) {
  return [...indexSource.matchAll(/name:\s*'([^']+)'/g)].map((match) => match[1])
}

export function upBody(source) {
  const start = source.search(/export\s+async\s+function\s+up\b/)
  if (start < 0) return ''
  const down = source.slice(start).search(/export\s+async\s+function\s+down\b/)
  return down < 0 ? source.slice(start) : source.slice(start, start + down)
}

function splitSql(source) {
  const statements = []
  let current = ''
  let quote = ''
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]
    const next = source[index + 1]
    if (!quote && char === '-' && next === '-') {
      const end = source.indexOf('\n', index)
      index = end < 0 ? source.length : end
      continue
    }
    if (!quote && char === '$') {
      const marker = source.slice(index).match(/^\$[A-Za-z0-9_]*\$/)
      if (marker) {
        quote = marker[0]
        current += marker[0]
        index += marker[0].length - 1
        continue
      }
    }
    if (quote.startsWith('$') && source.startsWith(quote, index)) {
      current += quote
      index += quote.length - 1
      quote = ''
      continue
    }
    if (!quote && char === "'") {
      quote = "'"
      current += char
      continue
    }
    if (quote === "'" && char === "'") {
      if (next === "'") {
        current += "''"
        index += 1
        continue
      }
      quote = ''
      current += char
      continue
    }
    if (!quote && char === ';') {
      statements.push(current)
      current = ''
      continue
    }
    current += char
  }
  if (current.trim()) statements.push(current)
  return statements.map((statement) => statement.replace(/\s+/g, ' ').trim()).filter(Boolean)
}

function ident(value) {
  return value.replace(/"/g, '').split('.').pop()
}

function addedColumn(statement, added) {
  const match = statement.match(/^alter table\s+(\S+)\s+add column\s+(?:if not exists\s+)?(\S+)\s+([\s\S]+)$/i)
  if (!match) return null
  const table = ident(match[1])
  const column = ident(match[2])
  const definition = match[3]
  if (/\b(unique|primary\s+key|references|check|generated)\b/i.test(definition)) {
    return { error: `${table}.${column}: у новой колонки нельзя объявлять ключ, ссылку или проверку` }
  }
  const hasDefault = /\bdefault\b/i.test(definition)
  const notNull = /\bnot null\b/i.test(definition)
  if (notNull && !hasDefault) {
    return { error: `${table}.${column}: NOT NULL без DEFAULT ломает запись из предыдущей версии CMS` }
  }
  const columns = added.get(table) ?? new Set()
  columns.add(column)
  added.set(table, columns)
  return { table, column }
}

function sqlTexts(source) {
  const texts = [...source.matchAll(/sql`([\s\S]*?)`/g)].map((match) => match[1])
  return texts.length ? texts : [source]
}

export function rollbackViolations(upSql) {
  const added = new Map()
  const createdTables = new Set()
  const problems = []
  for (const statement of sqlTexts(upSql).flatMap((text) => splitSql(text))) {
    // An unguarded CREATE cannot overwrite an existing table. Only subsequent
    // constraints/indexes on this exact new table are safe for an old CMS image.
    const newTable = statement.match(/^create table\s+(\S+)\s*\(/i)
    if (newTable) {
      createdTables.add(ident(newTable[1]))
      continue
    }
    if (/^create type\s+\S+\s+as\s+enum\s*\(/i.test(statement)) continue
    if (/^alter type\s+\S+\s+add value\s+/i.test(statement)) continue
    if (/^comment on\b/i.test(statement)) continue
    const column = addedColumn(statement, added)
    if (column?.error) {
      problems.push(column.error)
      continue
    }
    if (column) continue
    const constraint = statement.match(/^alter table\s+(\S+)\s+add constraint\s+\S+\s+foreign key\s*\(([^)]+)\)\s+references\b/i)
    if (constraint) {
      const table = ident(constraint[1])
      if (createdTables.has(table)) continue
      const columns = constraint[2].split(',').map((item) => ident(item.trim()))
      const created = added.get(table) ?? new Set()
      const existing = columns.filter((name) => !created.has(name))
      if (existing.length) problems.push(`${table}: внешний ключ на существующую колонку ${existing.join(', ')}`)
      continue
    }
    if (/^create unique index\b/i.test(statement)) {
      const target = statement.match(/\bon\s+(\S+)\s/i)
      if (!target || !createdTables.has(ident(target[1]))) problems.push('уникальный индекс может отвергнуть существующие записи')
      continue
    }
    if (/^create index\b/i.test(statement)) {
      if (/\bunique\b/i.test(statement)) problems.push('уникальный индекс может отвергнуть существующие записи')
      continue
    }
    const update = statement.match(/^update\s+(\S+)\s+set\s+(.+?)\s+where\s+(.+)$/i)
    if (update) {
      const table = ident(update[1])
      const assignment = update[2]
      const where = update[3]
      const target = assignment.match(/^("?[\w]+"?)\s*=/i)
      const columnName = target ? ident(target[1]) : ''
      const created = added.get(table) ?? new Set()
      if (!target || assignment.includes(',') || !created.has(columnName) || !new RegExp(`"?${columnName}"?\\s+is\\s+null\\b`, 'i').test(where)) {
        problems.push(`${table}: UPDATE меняет данные, которые уже читает предыдущая версия CMS`)
      }
      continue
    }
    problems.push(`недопустимое для автоматического отката выражение: ${statement.slice(0, 120)}`)
  }
  return problems
}

export function devMarkerDecision(rows, fileNames, historicalNames = []) {
  const files = new Set([...fileNames, ...historicalNames])
  const markers = rows.filter((row) => Number(row.batch) === -1)
  const applied = rows.filter((row) => Number(row.batch) !== -1)
  const unknown = applied.map((row) => row.name).filter((name) => !files.has(name))
  if (unknown.length) {
    return { action: 'blocked', reason: `В базе есть миграции, которых нет в репозитории: ${unknown.join(', ')}` }
  }
  if (rows.some((row) => !Number.isInteger(Number(row.batch)) || Number(row.batch) < -1)) {
    return { action: 'blocked', reason: 'В payload_migrations есть запись с непонятным batch' }
  }
  if (markers.length > 1) return { action: 'blocked', reason: 'В payload_migrations больше одной записи batch=-1' }
  if (markers.length === 1 && markers[0].name !== 'dev') {
    return { action: 'blocked', reason: `Маркер batch=-1 называется «${markers[0].name}», ожидается dev` }
  }
  if (markers.length === 1) {
    return { action: 'remove-marker', reason: 'Единственная аномалия — dev-маркер. Обычный релиз его не удаляет.' }
  }
  return { action: 'none', reason: 'Маркера batch=-1 нет' }
}

export function exceptionNames(source) {
  return source.split(/\r?\n/).map((line) => line.replace(/#.*/, '').trim()).filter(Boolean)
}

function readMigrationUp(name) {
  return upBody(readFileSync(path.join(migrationsDir, `${name}.ts`), 'utf8'))
}

export function checkRepositoryMigrations() {
  const names = migrationNames(readFileSync(path.join(migrationsDir, 'index.ts'), 'utf8'))
  const exceptions = new Set(exceptionNames(readFileSync(path.join(migrationsDir, 'expand-exceptions.txt'), 'utf8')))
  const history = exceptionNames(readFileSync(path.join(migrationsDir, 'history-baseline.txt'), 'utf8'))
  const missingFiles = names.filter((name) => {
    try {
      readFileSync(path.join(migrationsDir, `${name}.ts`))
      return false
    } catch {
      return true
    }
  })
  const problems = [
    ...missingFiles.map((name) => `${name}: файл миграции не найден`),
    ...names.filter((name) => !exceptions.has(name)).flatMap((name) => rollbackViolations(readMigrationUp(name)).map((problem) => `${name}: ${problem}`)),
  ]
  return { names, problems, exceptions: [...exceptions], history }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { problems } = checkRepositoryMigrations()
  if (problems.length) {
    console.error('Новая миграция несовместима с откатом на предыдущий образ:')
    for (const problem of problems) console.error(`- ${problem}`)
    process.exit(1)
  }
  console.log('Новые миграции совместимы с предыдущим образом CMS.')
}
