// Payload's bin.js starts its async loader with `void start()`. In a read-only
// production container that loader can exit 0 before migration initialization.
// Keep migration work in the module's awaited lifecycle instead.
process.env.CMS_MAINTENANCE = '1'
process.env.CMS_SEED = '0'
process.env.PAYLOAD_DB_PUSH = 'false'
process.env.PAYLOAD_MIGRATING = 'true'
export {}
const { default: payload } = await import('payload')
const { default: config } = await import('../src/payload.config')
try {
  await payload.init({ config, disableOnInit: true })
  await payload.db.migrate()
  console.log('Миграции PostgreSQL завершены; процесс дождался окончания обработки.')
} finally { await payload.destroy() }
process.exit(0)
