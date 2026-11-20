import { managedRedirect } from './lib/managed-redirects'
import { NextResponse, type NextRequest } from 'next/server'
import { legacyRedirect } from '../config/legacy-redirects'
import { REGION_COOKIE, SELECTED_REGION_COOKIE, regionFromSearch, regionFromSiteHost } from './lib/region-traffic'
import { attributionFromUrl, LEAD_ATTRIBUTION_COOKIE, readAttribution } from './lib/lead-attribution'
import { BUILT_GALLERY_COOKIE, BUILT_GALLERY_HEADER, BUILT_GALLERY_MAX_AGE, CATALOG_SESSION_COOKIE, CATALOG_SESSION_HEADER, catalogSessionSeed } from './lib/catalog/session'

export async function proxy(request: NextRequest) {
  const headers = new Headers(request.headers)
  const requestId = crypto.randomUUID()
  headers.set('x-avgst-request-id', requestId)
  headers.set('x-cms-page-route', request.nextUrl.pathname)
  headers.set('x-cms-editor', request.nextUrl.searchParams.has('cmsPreview') || request.nextUrl.searchParams.has('cmsIndex') ? '1' : '0')
  const savedCatalogSeed = request.cookies.get(CATALOG_SESSION_COOKIE)?.value
  const catalogSeed = request.nextUrl.pathname === '/catalog' ? catalogSessionSeed(savedCatalogSeed) : null
  const savedGallerySeed = request.cookies.get(BUILT_GALLERY_COOKIE)?.value
  const publishedProjectPage = /^\/catalog\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(request.nextUrl.pathname) && !request.nextUrl.searchParams.has('cmsPreview')
  const gallerySeed = publishedProjectPage ? catalogSessionSeed(savedGallerySeed) : null
  // Supply the first render with exactly the seed being saved on its response.
  headers.delete(CATALOG_SESSION_HEADER)
  if (catalogSeed) headers.set(CATALOG_SESSION_HEADER, catalogSeed)
  headers.delete(BUILT_GALLERY_HEADER)
  if (gallerySeed) headers.set(BUILT_GALLERY_HEADER, gallerySeed)
  const hostRegion = regionFromSiteHost(request.headers.get('host') ?? request.nextUrl.hostname)
  const selected = request.cookies.get(SELECTED_REGION_COOKIE)?.value
  const manual = selected === 'nn' || selected === 'msk' ? selected : null
  const marked = hostRegion === 'msk' ? 'msk' : manual ?? regionFromSearch(request.nextUrl.search)
  const saved = request.cookies.get(REGION_COOKIE)?.value
  headers.set('x-avgst-region', marked ?? (saved === 'msk' ? 'msk' : 'nn'))
  const managed = await managedRedirect(new URL(request.url))
  const legacy = managed ? { url: managed, status: 308 as const } : legacyRedirect(new URL(request.url))
  const response = legacy ? NextResponse.redirect(legacy.url, legacy.status) : NextResponse.next({ request: { headers } })
  response.headers.set('X-Request-ID', requestId)
  if (catalogSeed && catalogSeed !== savedCatalogSeed) response.cookies.set(CATALOG_SESSION_COOKIE, catalogSeed, { path: '/', httpOnly: true, sameSite: 'lax', secure: request.nextUrl.protocol === 'https:' })
  if (gallerySeed && gallerySeed !== savedGallerySeed) response.cookies.set(BUILT_GALLERY_COOKIE, gallerySeed, { path: '/catalog', maxAge: BUILT_GALLERY_MAX_AGE, httpOnly: true, sameSite: 'lax', secure: request.nextUrl.protocol === 'https:' })
  if (marked && marked !== saved) response.cookies.set(REGION_COOKIE, marked, { path: '/', sameSite: 'lax', secure: request.nextUrl.protocol === 'https:' })
  const attribution = attributionFromUrl(request.url)
  const previous = readAttribution(request.cookies.get(LEAD_ATTRIBUTION_COOKIE)?.value)
  if (Object.keys(attribution).length && previous.ref && !attribution.ref) attribution.ref = previous.ref
  if (Object.keys(attribution).length && !request.headers.has('next-router-prefetch')) {
    response.cookies.set(LEAD_ATTRIBUTION_COOKIE, JSON.stringify({ ...attribution, landing_page: `${request.nextUrl.protocol}//${request.headers.get('x-forwarded-host')?.split(',')[0]?.trim() || request.headers.get('host') || request.nextUrl.host}${request.nextUrl.pathname}`.slice(0, 1000) }), { path: '/', httpOnly: true, sameSite: 'lax', secure: request.nextUrl.protocol === 'https:' })
  }
  return response
}

export const config = { matcher: ['/((?!api|_next|.*\\.[^/]+$).*)'] }
