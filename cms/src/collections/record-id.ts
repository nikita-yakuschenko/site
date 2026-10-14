import type { PayloadRequest } from 'payload'
import { sql } from '@payloadcms/db-postgres'
import { generateRecordId } from '../../../src/lib/record-id'

type Drizzle = { execute: (query: ReturnType<typeof sql>) => Promise<{ rows: unknown[] }> }
type Adapter = { drizzle: Drizzle; sessions?: Record<string, { db: Drizzle }> }

// Issued codes stay reserved after a project is deleted, so a lead never points at a new project.
export async function claimProductCode(req: PayloadRequest): Promise<string> {
  const db = req.payload.db as unknown as Adapter
  const transaction = req.transactionID ? db.sessions?.[String(await req.transactionID)]?.db : undefined
  const drizzle = transaction ?? db.drizzle
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = generateRecordId()
    const result = await drizzle.execute(sql`INSERT INTO "product_codes" ("code") VALUES (${code}) ON CONFLICT DO NOTHING RETURNING "code"`)
    if (result.rows.length) return code
  }
  throw new Error('Не удалось выдать уникальный код')
}
