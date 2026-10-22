import { NextResponse } from 'next/server'
import { isRecordId } from '../record-id'
import { deviceKey, type DeviceSignals } from '../reactions'
import { parseConsent } from '../../consent/storage'
import { CONSENT_COOKIE, CONSENT_VERSION } from '../../consent/types'
import { optimizationFlags } from './flags'
import { parsePreferenceCodes, parsePreferenceSync, parseSetPreference, publicPreferenceResponse, PREFERENCE_BODY_LIMIT, operationIdPattern } from './preferences-contracts'
import { PREFERENCE_COOKIE, PREFERENCE_VOTER_COOKIE, readPreferenceIdentity, signPreferenceIdentity } from './preference-identity'

const headers = { 'Cache-Control': 'private, no-store' }
const failure = (error: string, status: number) => NextResponse.json({ error }, { status, headers })
const buckets = new Map<string, { hits: number; expires: number }>()
export function allowPreferenceRequest(key: string, now = Date.now()) {
  for (const [id, bucket] of buckets) if (bucket.expires <= now) buckets.delete(id)
  const current = buckets.get(key)
  if (current) { if (current.hits >= 60) return false; current.hits++; return true }
  if (buckets.size >= 2048) return false
  buckets.set(key, { hits: 1, expires: now + 60_000 })
  return true
}
export function samePreferenceOrigin(request: Request, publicOrigin = process.env.NEXT_PUBLIC_SITE_URL) {
  if (request.headers.get('sec-fetch-site') === 'cross-site') return false
  const origin = request.headers.get('origin')
  if (!origin) return false
  try { return new URL(origin).origin === new URL(publicOrigin || request.url).origin } catch { return false }
}
function cookieValues(request: Request) {
  const result = new Map<string, string>()
  for (const item of (request.headers.get('cookie') ?? '').split(';')) {
    const at = item.indexOf('=')
    if (at > 0) result.set(item.slice(0, at).trim(), item.slice(at + 1).trim())
  }
  return result
}
export async function readPreferenceJson(request: Request): Promise<unknown> {
  if (!request.body) throw new Error('bad_json')
  const reader = request.body.getReader(), chunks: Uint8Array[] = []
  let length = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      length += value.byteLength
      if (length > PREFERENCE_BODY_LIMIT) { await reader.cancel(); throw new Error('body_size') }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  const bytes = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) } catch { throw new Error('bad_json') }
}

type Action = 'batch' | 'set' | 'sync' | 'list' | 'legacy'
export async function handlePreferenceRequest(request: Request, action: Action, code?: string, legacyBody?: Record<string, unknown>) {
  if (!optimizationFlags().preferences) return failure('preferences_disabled', 503)
  const secret = process.env.OPTIMIZATION_PREFERENCES_SECRET, apiKey = process.env.CMS_SITE_API_KEY
  if (!secret || secret.length < 32 || !apiKey || apiKey.length < 32) return failure('not_configured', 503)
  const mutation = action === 'set' || action === 'sync' || action === 'legacy'
  if (mutation && !samePreferenceOrigin(request)) return failure('origin', 403)
  if (!allowPreferenceRequest((request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'local').trim().slice(0, 120))) return failure('rate_limit', 429)
  const cookies = cookieValues(request), consent = parseConsent(cookies.get(CONSENT_COOKIE))
  if (!consent || consent.version !== CONSENT_VERSION || !consent.decidedAt || !consent.functional) return failure('functional_consent_required', 403)
  let payload: Record<string, unknown> = {}
  try {
    const params = new URL(request.url).searchParams
    if (action === 'batch') {
      if ([...params.keys()].some(k => k !== 'codes')) return failure('invalid_input', 400)
      const codes = parsePreferenceCodes((params.get('codes') ?? '').split(','))
      if (!codes) return failure('invalid_input', 400)
      payload = { codes }
    } else if (action === 'list') {
      if ([...params.keys()].some(k => k !== 'after') || (params.has('after') && !isRecordId(params.get('after')))) return failure('invalid_input', 400)
      payload = params.has('after') ? { after: params.get('after') } : {}
    } else if (action === 'set') {
      const input = parseSetPreference(await readPreferenceJson(request))
      if (!input || !isRecordId(code)) return failure('invalid_input', 400)
      payload = { project_code: code, mutation: input }
    } else if (action === 'sync') {
      const input = parsePreferenceSync(await readPreferenceJson(request))
      if (!input) return failure('invalid_input', 400)
      payload = { migration: input }
    } else {
      const body = legacyBody!
      if (Object.keys(body).some(k => !['slug', 'action', 'signals', 'operation_id', 'expected_revision'].includes(k)) || typeof body.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(body.slug) || !['like', 'unlike'].includes(String(body.action))) return failure('invalid_input', 400)
      if (body.operation_id !== undefined && (typeof body.operation_id !== 'string' || !operationIdPattern.test(body.operation_id))) return failure('operation_id', 400)
      if (body.expected_revision !== undefined && (!Number.isSafeInteger(body.expected_revision) || Number(body.expected_revision) < 0)) return failure('revision', 400)
      payload = { slug: body.slug, action: body.action, ...(body.operation_id ? { operation_id: body.operation_id } : {}), ...(body.expected_revision !== undefined ? { expected_revision: body.expected_revision } : {}), fingerprint_key: deviceKey(request, body.signals as DeviceSignals | undefined, apiKey) }
    }
  } catch (error) { return failure(error instanceof Error && error.message === 'body_size' ? 'body_size' : 'bad_json', error instanceof Error && error.message === 'body_size' ? 413 : 400) }
  const identity = readPreferenceIdentity(cookies.get(PREFERENCE_COOKIE), cookies.get(PREFERENCE_VOTER_COOKIE), secret)
  const attachIdentity = (response: NextResponse) => {
    const options = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/' }
    response.cookies.set(PREFERENCE_COOKIE, signPreferenceIdentity(identity.id, secret), options)
    response.cookies.set(PREFERENCE_VOTER_COOKIE, identity.id, { ...options, maxAge: 365 * 24 * 3600 })
    return response
  }
  // No write before a browser key is established: a lost first response cannot
  // turn the same operation retry into a second subject's counted like.
  const validLegacy = /^[a-f0-9]{32}$/.test(cookies.get(PREFERENCE_VOTER_COOKIE) ?? '')
  if (mutation && !identity.established && !(action === 'legacy' && validLegacy)) return attachIdentity(failure('identity_required', 428))
  const region = cookies.get('avgst_region') === 'msk' ? 'msk' : 'nn'
  try {
    const origin = process.env.CMS_PUBLIC_URL || (process.env.NODE_ENV === 'production' ? 'https://cms.avgst.ru' : 'http://localhost:3001')
    const response = await fetch(`${origin}/api/optimization/preferences/${action}`, {
      method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(8000),
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, voter_key: `c:${identity.id}`, region, analytics_allowed: consent.analytics === true }),
    })
    // Forward only contract JSON, never upstream cookies/authorization/debug text.
    const body = publicPreferenceResponse(action, await response.json(), response.status)
    if (!body) return attachIdentity(failure('invalid_upstream_response', 502))
    const status = [200, 400, 404, 409, 428, 503].includes(response.status) ? response.status : 502
    return attachIdentity(NextResponse.json(body, { status, headers }))
  } catch { return attachIdentity(failure('preferences_unavailable', 503)) }
}
