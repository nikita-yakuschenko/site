import { sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'
import { nationalPhone } from './phone'

type Query = ReturnType<typeof sql>
type Transaction = { execute(query: Query): Promise<{ rows: { dialog_id: string }[] }> }
type Adapter = { drizzle: { transaction<T>(run: (tx: Transaction) => Promise<T>): Promise<T> } }

export async function resolveWhatsAppDialog(payload: Payload, line: string | number, phone: string, peer = '') {
  const number = nationalPhone(phone)
  const lid = /^\d+@lid$/.test(peer) ? peer : ''
  const aliases = [number, lid].filter(Boolean)
  if (!aliases.length) return null
  const scope = String(line)
  const { drizzle } = payload.db as unknown as Adapter
  return drizzle.transaction(async tx => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${'whatsapp-dialog:' + scope}, 0))`)
    const existing = await tx.execute(sql`
      SELECT dialog_id FROM whatsapp_dialog_aliases
      WHERE line = ${scope} AND alias IN (${number}, ${lid})
      ORDER BY created_at, alias LIMIT 1
    `)
    const id = existing.rows[0]?.dialog_id || (number ? `whatsapp:${number}` : `whatsapp:peer:${lid}`)
    for (const alias of aliases) {
      await tx.execute(sql`
        INSERT INTO whatsapp_dialog_aliases (line, alias, dialog_id)
        VALUES (${scope}, ${alias}, ${id})
        ON CONFLICT (line, alias) DO UPDATE SET dialog_id = EXCLUDED.dialog_id
      `)
    }
    return id
  })
}
