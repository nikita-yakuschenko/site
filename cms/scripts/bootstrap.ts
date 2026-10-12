import { getPayload } from 'payload'
import { createFirstAdmin, validateFirstAdmin } from '../src/access/bootstrap'
import { existsSync } from 'node:fs'

if (existsSync('.env')) process.loadEnvFile('.env')

// Infrastructure supplies credentials via environment, never command arguments.
const input = {
  email: process.env.CMS_BOOTSTRAP_EMAIL || '',
  password: process.env.CMS_BOOTSTRAP_PASSWORD || '',
  firstName: process.env.CMS_BOOTSTRAP_FIRST_NAME || '',
  lastName: process.env.CMS_BOOTSTRAP_LAST_NAME || '',
}
for (const name of Object.keys(process.env).filter((name) => name.startsWith('CMS_BOOTSTRAP_'))) delete process.env[name]

let payload: Awaited<ReturnType<typeof getPayload>> | undefined
try {
  validateFirstAdmin(input)
  const { default: config } = await import('../src/payload.config')
  payload = await getPayload({ config })
  await createFirstAdmin(payload, input)
  console.log('Первый суперадминистратор создан. Удалите CMS_BOOTSTRAP_* из окружения.')
} catch {
  // Database/validation errors can embed credentials. Do not echo raw errors.
  console.error('Инициализация не выполнена. Проверьте миграции, окружение и отсутствие пользователей.')
  process.exitCode = 1
} finally {
  input.password = ''
  if (payload) await payload.destroy()
}
// Payload's CLI does the same: close DB first, then stop tooling workers.
process.exit(process.exitCode ?? 0)
