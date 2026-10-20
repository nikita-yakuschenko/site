import { NextResponse, type NextRequest } from 'next/server'
import { REGION_COOKIE, regionFromSearch } from './lib/region-traffic'

export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers)
  headers.set('x-cms-page-route', request.nextUrl.pathname)
  const marked = regionFromSearch(request.nextUrl.search)
  const saved = request.cookies.get(REGION_COOKIE)?.value
  headers.set('x-avgst-region', marked ?? (saved === 'msk' ? 'msk' : 'nn'))
  const response = NextResponse.next({ request: { headers } })
  if (marked) response.cookies.set(REGION_COOKIE, marked, { path: '/', sameSite: 'lax', secure: request.nextUrl.protocol === 'https:' })
  return response
}

export const config = { matcher: ['/((?!api|_next|.*\\.[^/]+$).*)'] }
