import type { Endpoint } from 'payload'
import { authorizeSiteRequest } from '../collections/project-hero-endpoint'
import { preferenceDatabase } from './likes-endpoints'
import { optimizationFlags } from './flags'
import { EventIngressError, ingestOptimizationEvents } from './events'
import { boundedOptimizationJson, optimizationRateLimiter } from '../../../src/lib/optimization/http'
import { MAX_EVENT_BODY_BYTES, parseEventBatch } from '../../../src/lib/optimization/contracts'
import { optimizationContextSecret, verifyOptimizationCookie } from '../../../src/lib/optimization/server-context'

const allow = optimizationRateLimiter(120)
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })
export const optimizationEndpoints: Endpoint[] = [{ path: '/optimization/events', method: 'post', handler: async req => {
  const denied = authorizeSiteRequest(req)
  if (denied) return denied
  if (!optimizationFlags().events) return reply({ error: 'events_disabled' }, 503)
  const secret = optimizationContextSecret()
  if (!secret) return reply({ error: 'events_unavailable' }, 503)
  let input: unknown
  try { input = await boundedOptimizationJson(req, MAX_EVENT_BODY_BYTES + 4096) } catch (error) { const size = error instanceof Error && error.message === 'body_size'; return reply({ error: size ? 'body_size' : 'bad_json' }, size ? 413 : 400) }
  if (!input || typeof input !== 'object' || Array.isArray(input)) return reply({ error: 'invalid_input' }, 400)
  const envelope = input as Record<string, unknown>
  if (Object.keys(envelope).some(key => !['batch', 'context_token', 'region', 'analytics_allowed'].includes(key)) || typeof envelope.context_token !== 'string' || !['nn', 'msk'].includes(String(envelope.region))) return reply({ error: 'invalid_input' }, 400)
  const identity = verifyOptimizationCookie(envelope.context_token, secret)
  if (!identity) return reply({ error: 'context_required' }, 403)
  if (envelope.analytics_allowed !== true) return reply({ error: 'analytics_consent_required' }, 403)
  if (!allow(identity.subjectKey)) return reply({ error: 'rate_limit' }, 429)
  const batch = parseEventBatch(envelope.batch)
  if (!batch.ok) return reply({ error: 'invalid_input' }, 400)
  try { return reply(await ingestOptimizationEvents(preferenceDatabase(req), batch.value, { ...identity, region: envelope.region as 'nn' | 'msk', analyticsAllowed: true, prefetch: false }, secret)) }
  catch (error) { return error instanceof EventIngressError ? reply({ error: error.reason }, error.status) : reply({ error: 'events_unavailable' }, 503) }
} }]
