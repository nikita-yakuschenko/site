import { operationIdPattern } from './preferences-contracts'
import type { EventBatch, OptimizationRegion } from './contracts'

/** Server-only gateway. No upstream headers, cookies, database errors or identifiers escape to the browser. */
export async function sendOptimizationEvents(batch: EventBatch, token: string, region: OptimizationRegion) {
  const key = process.env.CMS_SITE_API_KEY
  if (!key || key.length < 32) return { status: 503, body: { error: 'not_configured' } }
  const origin = process.env.CMS_PUBLIC_URL || (process.env.NODE_ENV === 'production' ? 'https://cms.avgst.ru' : 'http://localhost:3001')
  try {
    const response = await fetch(`${origin}/api/optimization/events`, { method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(8000), headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ batch, context_token: token, region, analytics_allowed: true }) })
    const body = await response.json()
    if (response.status === 200 && Array.isArray(body.results) && body.results.length === batch.events.length) {
      const expected = new Set(batch.events.map(event => event.event_id))
      const results = []
      for (const item of body.results) {
        if (!item || !expected.delete(item.event_id) || !['accepted', 'duplicate'].includes(item.status) || (item.exposure_id !== undefined && !operationIdPattern.test(item.exposure_id))) return { status: 502, body: { error: 'invalid_upstream_response' } }
        results.push({ event_id: item.event_id, status: item.status, ...(item.exposure_id ? { exposure_id: item.exposure_id } : {}) })
      }
      return { status: 200, body: { results } }
    }
    if ([400, 403, 409, 413, 429, 503].includes(response.status) && ['invalid_input', 'body_size', 'bad_json', 'events_disabled', 'analytics_consent_required', 'context_required', 'region_mismatch', 'decision_context', 'decision_expired', 'decision_not_learning', 'exposure_required', 'exposure_conflict', 'event_conflict', 'project_unavailable', 'event_time_window', 'events_unavailable', 'rate_limit'].includes(body?.error)) return { status: response.status, body: { error: body.error } }
    return { status: 502, body: { error: 'invalid_upstream_response' } }
  } catch { return { status: 503, body: { error: 'events_unavailable' } } }
}
