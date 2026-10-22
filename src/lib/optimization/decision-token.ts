import { createHmac, timingSafeEqual } from 'node:crypto'
import { operationIdPattern } from './preferences-contracts'

export const INGESTION_GRACE_MS = 24 * 3600_000
export type DecisionToken = { decision_id: string; subject_key: string; session_key: string; region: 'nn' | 'msk'; assigned_at: number; expires_at: number }
export function signDecisionToken(context: DecisionToken, secret: string) {
  if (secret.length < 32) throw new Error('Missing context secret')
  const body = Buffer.from(JSON.stringify(context)).toString('base64url')
  return `${body}.${createHmac('sha256', secret).update(`optimization-decision:v1:${body}`).digest('hex')}`
}
export function verifyDecisionToken(token: string | undefined, secret: string, now = Date.now()): DecisionToken | null {
  if (secret.length < 32 || !token || token.length > 2048) return null
  const [body, signature, ...extra] = token.split('.')
  if (extra.length || !/^[A-Za-z0-9_-]+$/.test(body ?? '') || !/^[a-f0-9]{64}$/.test(signature ?? '')) return null
  const expected = createHmac('sha256', secret).update(`optimization-decision:v1:${body}`).digest('hex')
  if (!timingSafeEqual(Buffer.from(signature!, 'hex'), Buffer.from(expected, 'hex'))) return null
  try {
    const value = JSON.parse(Buffer.from(body!, 'base64url').toString()) as DecisionToken
    if (!value || Object.keys(value).sort().join(',') !== 'assigned_at,decision_id,expires_at,region,session_key,subject_key' || !operationIdPattern.test(value.decision_id) || !/^[a-f0-9]{64}$/.test(value.subject_key) || !/^[a-f0-9]{64}$/.test(value.session_key) || !['nn', 'msk'].includes(value.region) || !Number.isSafeInteger(value.assigned_at) || !Number.isSafeInteger(value.expires_at) || value.expires_at <= value.assigned_at || value.expires_at - value.assigned_at > 24 * 3600_000 || value.assigned_at > now + 300_000 || now > value.expires_at + INGESTION_GRACE_MS) return null
    return value
  } catch { return null }
}
