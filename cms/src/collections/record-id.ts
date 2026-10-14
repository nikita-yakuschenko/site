import type { CollectionConfig, PayloadRequest } from 'payload'
import { sql } from '@payloadcms/db-postgres'
import { generateRecordId } from '../../../src/lib/record-id'

type Drizzle = { execute: (query: ReturnType<typeof sql>) => Promise<{ rows: unknown[] }> }
type Adapter = { drizzle: Drizzle; sessions?: Record<string, { db: Drizzle }> }

// Registry keeps every issued ID, so no ID repeats across collections or after deletion
async function claimRecordId(req: PayloadRequest, collection: string): Promise<string> {
  const db = req.payload.db as unknown as Adapter
  // Inside the request transaction an unused ID is released together with the record
  const transaction = req.transactionID ? db.sessions?.[String(await req.transactionID)]?.db : undefined
  const drizzle = transaction ?? db.drizzle
  for (let attempt = 0; attempt < 20; attempt++) {
    const id = generateRecordId()
    const result = await drizzle.execute(sql`INSERT INTO "record_ids" ("id", "collection") VALUES (${id}, ${collection}) ON CONFLICT DO NOTHING RETURNING "id"`)
    if (result.rows.length) return id
  }
  throw new Error('Не удалось выдать уникальный ID')
}

export function withRecordId(collection: CollectionConfig): CollectionConfig {
  return {
    ...collection,
    fields: [{ name: 'id', type: 'text', admin: { hidden: true } }, ...collection.fields],
    hooks: {
      ...collection.hooks,
      beforeValidate: [async ({ data, operation, req }) => {
        // Client-supplied IDs are ignored: only the registry issues them
        if (operation === 'create' && data) data.id = await claimRecordId(req, collection.slug)
        return data
      }, ...(collection.hooks?.beforeValidate ?? [])],
    },
  }
}
