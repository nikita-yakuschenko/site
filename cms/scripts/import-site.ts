import { existsSync } from 'node:fs'
import { getPayload } from 'payload'

if (existsSync('.env')) process.loadEnvFile('.env')
const { default: config } = await import('../src/payload.config')
const { ensureSiteStructure } = await import('../src/seed/ensure-site-structure')
const payload = await getPayload({ config })
try {
  await ensureSiteStructure(payload)
} finally {
  await payload.destroy()
}
process.exit(0)
