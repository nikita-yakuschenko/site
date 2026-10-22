import { NextResponse } from 'next/server'
import { optimizationFlags } from './flags'
import { MAX_EVENT_BODY_BYTES, parseEventBatch } from './contracts'
import { samePreferenceOrigin } from './preferences-server'
import { boundedOptimizationJson, optimizationRateLimiter } from './http'
import { contextFromRequest, OPTIMIZATION_CONTEXT_COOKIE, requestCookie, isOptimizationPrefetch } from './server-context'
import { sendOptimizationEvents } from './server-client'

const allow = optimizationRateLimiter()
const reply = (body: unknown, status: number) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })
export async function handleOptimizationEvents(request: Request) {
  if (!optimizationFlags().events) return reply({ error: 'events_disabled' }, 503)
  if (!samePreferenceOrigin(request)) return reply({ error: 'origin' }, 403)
  if (isOptimizationPrefetch(request.headers) || new URL(request.url).search) return reply({ error: 'invalid_input' }, 400)
  if (!allow((request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'local').trim().slice(0, 120))) return reply({ error: 'rate_limit' }, 429)
  const token = requestCookie(request, OPTIMIZATION_CONTEXT_COOKIE)
  const region = requestCookie(request, 'avgst_region') === 'msk' ? 'msk' : 'nn'
  const context = token && contextFromRequest(request, token, region)
  if (!context) return reply({ error: 'context_required' }, 403)
  if (!context.analyticsAllowed) return reply({ error: 'analytics_consent_required' }, 403)
  let input: unknown
  try { input = await boundedOptimizationJson(request, MAX_EVENT_BODY_BYTES) } catch (error) { const size = error instanceof Error && error.message === 'body_size'; return reply({ error: size ? 'body_size' : 'bad_json' }, size ? 413 : 400) }
  const batch = parseEventBatch(input)
  if (!batch.ok) return reply({ error: 'invalid_input' }, 400)
  if (batch.value.events.some(event => event.region !== region)) return reply({ error: 'region_mismatch' }, 409)
  const result = await sendOptimizationEvents(batch.value, token!, region)
  return reply(result.body, result.status)
}
