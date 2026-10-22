import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

export const PREFERENCE_COOKIE = 'avgst_preferences'
export const PREFERENCE_VOTER_COOKIE = 'avgst_voter'
const voter = /^[a-f0-9]{32}$/
const signature = (id: string, secret: string) => createHmac('sha256', secret).update(`preferences-cookie:v1:${id}`).digest('hex')

export function signPreferenceIdentity(id: string, secret: string) {
  if (!voter.test(id) || secret.length < 32) throw new Error('Invalid preference identity')
  return `${id}.${signature(id, secret)}`
}
export function readPreferenceIdentity(signed: string | undefined, legacy: string | undefined, secret: string) {
  if (secret.length < 32) throw new Error('Missing preferences secret')
  const parts = (signed ?? '').split('.'), [id, mac] = parts
  if (parts.length === 2 && id && voter.test(id) && mac && /^[a-f0-9]{64}$/.test(mac) && timingSafeEqual(Buffer.from(mac, 'hex'), Buffer.from(signature(id, secret), 'hex'))) return { id, established: true }
  return { id: legacy && voter.test(legacy) ? legacy : randomBytes(16).toString('hex'), established: false }
}
