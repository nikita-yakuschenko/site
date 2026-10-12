import type { Payload } from 'payload'
import { bootstrapFirstAdmin } from './bootstrap-context'

export interface FirstAdminInput {
  email: string
  password: string
  firstName: string
  lastName: string
}

export function validateFirstAdmin(input: FirstAdminInput) {
  if (!input.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) throw new Error('Valid email required')
  if (!input.password || input.password.length < 16) throw new Error('Password must contain at least 16 characters')
  if (!input.firstName?.trim() || !input.lastName?.trim()) throw new Error('First and last names required')
}

export async function createFirstAdmin(payload: Payload, input: FirstAdminInput) {
  validateFirstAdmin(input)
  // Serialize concurrent infrastructure bootstrap commands across processes.
  // The lock lives on one checked-out PostgreSQL connection, not a pool query.
  const connection = await payload.db.pool.connect()
  try {
    await connection.query('SELECT pg_advisory_lock(47004001)')
    const { totalDocs } = await payload.count({ collection: 'users', overrideAccess: true })
    if (totalDocs !== 0) throw new Error('Bootstrap refused: users already exist')
    const user = await payload.create({
      collection: 'users', overrideAccess: true,
      context: { [bootstrapFirstAdmin]: true },
      data: { ...input, role: 'super-admin', isBlocked: false },
    })
    return user.id
  } finally {
    await connection.query('SELECT pg_advisory_unlock(47004001)')
    connection.release()
  }
}
