import { getPayload } from 'payload'
import { createFirstAdmin, validateFirstAdmin } from '../src/access/bootstrap'
import { existsSync, readFileSync } from 'node:fs'

if (existsSync('.env')) process.loadEnvFile('.env')

// The admin file may start with a BOM, which process.loadEnvFile keeps in the first key.
function adminCredentials() {
  if (!existsSync('.env.local-admin')) return { email: '', password: '' }
  const values: Record<string, string> = {}
  for (const line of readFileSync('.env.local-admin', 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const match = line.match(/^([^#=\s]+)\s*=\s*(.*)$/)
    if (match) values[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '')
  }
  return { email: values.email || '', password: values.password || '' }
}

const credentials = adminCredentials()
const input = {
  email: credentials.email,
  password: credentials.password,
  firstName: 'Никита',
  lastName: 'Якущенко',
}

let payload: Awaited<ReturnType<typeof getPayload>> | undefined
try {
  validateFirstAdmin(input)
  const { default: config } = await import('../src/payload.config')
  payload = await getPayload({ config })
  await createFirstAdmin(payload, input)
  console.log('Первый суперадминистратор создан: Никита Якущенко.')
} catch (error) {
  // Database/validation errors can embed credentials. Do not echo raw errors.
  let detail = String(error instanceof Error ? error.message : error)
  if (input.password) detail = detail.replaceAll(input.password, '(password)')
  if (input.email) detail = detail.replaceAll(input.email, '(email)')
  console.error('Инициализация не выполнена. Проверьте миграции, окружение и отсутствие пользователей.')
  console.error(detail.slice(0, 400))
  process.exitCode = 1
} finally {
  input.password = ''
  if (payload) await payload.destroy()
}
// Payload's CLI does the same: close DB first, then stop tooling workers.
process.exit(process.exitCode ?? 0)
