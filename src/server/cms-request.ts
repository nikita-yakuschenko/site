import 'server-only'
import { randomUUID } from 'node:crypto'
import type { CatalogProject } from '../lib/catalog/types'

export type CMSOperation = 'catalog' | 'catalog.readiness' | 'content' | 'settings.metrica' | 'settings.roistat' | 'settings.maps'
type Failure = 'not-configured' | 'http' | 'timeout' | 'network' | 'invalid-response'
type CMSRequestInit = RequestInit & { next?: { revalidate?: number | false; tags?: string[] } }
type Context = { requestId?: string; route?: string; rethrow?: (error: unknown) => void }

export class CMSUnavailableError extends Error {
  readonly operation: CMSOperation
  readonly reason: Failure
  readonly upstreamStatus?: number

  constructor(operation: CMSOperation, reason: Failure, upstreamStatus?: number) {
    // Never include URLs, payloads, headers or the underlying fetch error.
    super('Данные сайта временно недоступны')
    this.name = 'CMSUnavailableError'
    this.operation = operation
    this.reason = reason
    this.upstreamStatus = upstreamStatus
  }
}

export function isCMSUnavailable(error: unknown): error is CMSUnavailableError {
  return error instanceof CMSUnavailableError
}

export function requestId(value?: string | null): string {
  return value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) ? value : randomUUID()
}

const publicRoutes = new Set(['/', '/about', '/catalog', '/manufacture', '/stories', '/business', '/mortgage', '/family-mortgage', '/basic-mortgage', '/it-mortgage', '/exposition', '/dealers', '/factory-open-day', '/for-sale', '/privacy', '/cookies', '/referral', '/api/ready', '/api/catalog/availability', '/api/maps-key'])

export function routeTemplate(path: string | null | undefined): string {
  const pathname = path?.split('?')[0] || ''
  if (publicRoutes.has(pathname)) return pathname
  if (pathname.startsWith('/catalog/')) return '/catalog/[slug]'
  if (pathname.startsWith('/exposition/')) return '/exposition/[slug]'
  return '/other'
}

export function recordCMSFailure(operation: CMSOperation, reason: Failure, context: Context = {}, status?: number) {
  console.warn(JSON.stringify({ event: 'cms.request', operation, outcome: reason, status, requestId: requestId(context.requestId), route: routeTemplate(context.route), buildId: process.env.APP_BUILD_ID || 'unknown' }))
}

/** Timings include fetch + JSON decoding; cachePolicy is configured policy, not an inferred HIT. */
export async function requestCMSJSON<T>(operation: CMSOperation, url: string, init: CMSRequestInit, decode: (data: unknown) => T, context: Context = {}): Promise<T> {
  const started = performance.now()
  const id = requestId(context.requestId)
  let status: number | undefined
  let outcome: 'ok' | Failure | undefined
  try {
    const response = await fetch(url, init)
    status = response.status
    if (!response.ok) throw new CMSUnavailableError(operation, 'http', status)
    let data: unknown
    try { data = await response.json() } catch { throw new CMSUnavailableError(operation, 'invalid-response', status) }
    let decoded: T
    try { decoded = decode(data) } catch { throw new CMSUnavailableError(operation, 'invalid-response', status) }
    outcome = 'ok'
    return decoded
  } catch (error) {
    // Preserve Next request-time/prerender/navigation control flow.
    context.rethrow?.(error)
    const reason = error instanceof CMSUnavailableError ? error.reason
      : error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError') ? 'timeout' : 'network'
    outcome = reason
    throw error instanceof CMSUnavailableError ? error : new CMSUnavailableError(operation, reason, status)
  } finally {
    const durationMs = Math.round((performance.now() - started) * 10) / 10
    if (outcome && (outcome !== 'ok' || durationMs >= 500 || process.env.CMS_REQUEST_LOGS === 'all')) {
      console[outcome === 'ok' ? 'info' : 'warn'](JSON.stringify({
        event: 'cms.request', operation, requestId: id, route: routeTemplate(context.route),
        outcome, status, durationMs, buildId: process.env.APP_BUILD_ID || 'unknown',
        cachePolicy: init.cache === 'no-store' ? 'no-store' : init.next?.revalidate ?? 'default',
      }))
    }
  }
}

export function decodeObject(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid CMS response')
  return data as Record<string, unknown>
}

/** Check the fields used by the shell/provider before treating an HTTP 200 as valid data. */
export function decodeCatalog(data: unknown): CatalogProject[] {
  const items = decodeObject(data).items
  if (!Array.isArray(items) || !items.every(item => {
    if (!item || typeof item !== 'object') return false
    return ['id', 'slug', 'name', 'href', 'imageUrl', 'technology', 'series'].every(key => typeof item[key] === 'string')
      && ['areaValue', 'floorsValue'].every(key => typeof item[key] === 'number' && Number.isFinite(item[key]))
      && ['about', 'exteriors', 'interiors', 'floorPlans', 'options'].every(key => Array.isArray(item[key]))
      && (item.priceAmount === null || typeof item.priceAmount === 'number' && Number.isFinite(item.priceAmount))
      && (item.readyHome === undefined || item.readyHome !== null && typeof item.readyHome === 'object' && typeof item.readyHome.salePrice === 'number')
  })) throw new Error('Invalid catalog response')
  return items as CatalogProject[]
}
