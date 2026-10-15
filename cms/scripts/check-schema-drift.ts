process.env.CMS_SEED = '0'
process.env.PAYLOAD_DB_PUSH = 'false'

export {}

function blocksRelease(statement: string) {
  if (/row level security/i.test(statement)) return false
  if (/"product_codes"/i.test(statement)) return false
  if (/login_attempts/i.test(statement)) return false
  if (/\b(drop|create)\s+index\b/i.test(statement)) return false
  if (/\b(drop|add)\s+constraint\b/i.test(statement)) return false
  return true
}

const { getPayload } = await import('payload')
const { default: config } = await import('../src/payload.config')

const payload = await getPayload({ config })
try {
  const adapter = payload.db as {
    schema: Record<string, unknown>
    drizzle: unknown
    requireDrizzleKit?: () => {
      pushSchema: (
        schema: Record<string, unknown>,
        drizzle: unknown,
      ) => Promise<{ statementsToExecute?: string[] }>
    }
  }
  const pushSchema = adapter.requireDrizzleKit?.().pushSchema
  if (!pushSchema) throw new Error('В адаптере PostgreSQL нет проверки схемы')
  const result = await pushSchema(adapter.schema, adapter.drizzle)
  const statements = result.statementsToExecute ?? []
  const blocking = statements.filter(blocksRelease)
  if (blocking.length) {
    console.error('В схеме не хватает изменений из конфигурации Payload:')
    for (const statement of blocking) console.error(statement)
    process.exitCode = 1
  } else if (statements.length) {
    console.log(`Схема содержит ${statements.length} старых расхождений имён индексов. Колонки миграций на месте.`)
  } else {
    console.log('Схема совпадает с конфигурацией Payload.')
  }
} finally {
  await payload.destroy()
}
process.exit(process.exitCode ?? 0)
