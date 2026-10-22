import { managedRedirect } from './lib/managed-redirects'
import { NextResponse, type NextRequest } from 'next/server'
import { legacyRedirect } from '../config/legacy-redirects'
import { REGION_COOKIE, regionFromSearch } from './lib/region-traffic'
import { attributionFromUrl, LEAD_ATTRIBUTION_COOKIE } from './lib/lead-attribution'
import { OPTIMIZATION_CONTEXT_COOKIE, OPTIMIZATION_PREFETCH_HEADER, prepareOptimizationProxy } from './lib/optimization/server-context'

export async function proxy(request: NextRequest) {
  const headers = new Headers(request.headers)
  headers.set('x-cms-page-route', request.nextUrl.pathname)
  const marked = regionFromSearch(request.nextUrl.search)
  const saved = request.cookies.get(REGION_COOKIE)?.value
  headers.set('x-avgst-region', marked ?? (saved === 'msk' ? 'msk' : 'nn'))
  const optimizationToken = prepareOptimizationProxy(request, headers)
  const managed = await managedRedirect(new URL(request.url))
  const legacy = managed ? { url: managed, status: 308 as const } : legacyRedirect(new URL(request.url))
  const response = legacy ? NextResponse.redirect(legacy.url, legacy.status) : NextResponse.next({ request: { headers } })
  if (headers.has(OPTIMIZATION_PREFETCH_HEADER)) response.headers.set('Cache-Control', 'private, no-store')
  if (optimizationToken) {
    response.cookies.set(OPTIMIZATION_CONTEXT_COOKIE, optimizationToken, { path: '/', httpOnly: true, sameSite: 'lax', secure: request.nextUrl.protocol === 'https:' })
    response.headers.set('Cache-Control', 'private, no-store')
  }
  if (marked) response.cookies.set(REGION_COOKIE, marked, { path: '/', sameSite: 'lax', secure: request.nextUrl.protocol === 'https:' })
  const attribution = attributionFromUrl(request.url)
  if (Object.keys(attribution).length && !request.headers.has('next-router-prefetch')) {
    response.cookies.set(LEAD_ATTRIBUTION_COOKIE, JSON.stringify({ ...attribution, landing_page: `${request.nextUrl.protocol}//${request.headers.get('x-forwarded-host')?.split(',')[0]?.trim() || request.headers.get('host') || request.nextUrl.host}${request.nextUrl.pathname}`.slice(0, 1000) }), { path: '/', httpOnly: true, sameSite: 'lax', secure: request.nextUrl.protocol === 'https:' })
  }
  return response
}

export const config = { matcher: ['/((?!api|_next|.*\\.[^/]+$).*)'] }
