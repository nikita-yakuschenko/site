import config from '@payload-config'
import { getPayload } from 'payload'
import { requiredMigrations } from '../../../config/required-migrations'

export const dynamic = 'force-dynamic'

// Confirms this process can read the database and that every shipped migration is recorded.
export async function GET() {
  const expected = requiredMigrations
  const headers = { 'Cache-Control': 'no-store' }
  try {
    const payload = await getPayload({ config })
    const found = await payload.find({ collection: 'payload-migrations', limit: expected.length + 20, depth: 0, pagination: false })
    const applied = new Set(found.docs.filter((doc) => typeof doc.batch === 'number' && doc.batch > 0).map((doc) => doc.name))
    const missing = expected.filter((name) => !applied.has(name))
    if (missing.length) {
      return Response.json({ status: 'not-ready', missing }, { status: 503, headers })
    }
    return Response.json({ status: 'ready', revision: process.env.CMS_REVISION ?? 'unknown' }, { headers })
  } catch {
    return Response.json({ status: 'not-ready' }, { status: 503, headers })
  }
}
