import { NextRequest, NextResponse } from 'next/server'
import { MOSCOW_SITE_HOST, PRIMARY_SITE_HOST, REGION_COOKIE, SELECTED_REGION_COOKIE, regionFromSiteHost } from '../../../lib/region-traffic'

export function GET(request: NextRequest) {
  const region = regionFromSiteHost(request.headers.get('host') ?? request.nextUrl.hostname)
  if (!region) return new Response(null, { status: 404 })

  const origin = `https://${region === 'msk' ? MOSCOW_SITE_HOST : PRIMARY_SITE_HOST}`
  const returnTo = request.nextUrl.searchParams.get('returnTo') ?? '/'
  const target = new URL('/', origin)
  if (returnTo.startsWith('/') && !returnTo.startsWith('//')) {
    const candidate = URL.parse(returnTo, origin)
    if (candidate?.origin === origin && candidate.pathname !== '/api/site-region' && candidate.pathname !== '/api/site-region/') {
      target.pathname = candidate.pathname
      target.search = candidate.search
      target.hash = candidate.hash
    }
  }

  const response = NextResponse.redirect(target, 303)
  response.headers.set('Cache-Control', 'no-store')
  for (const name of [REGION_COOKIE, SELECTED_REGION_COOKIE]) {
    response.cookies.set(name, region, { path: '/', sameSite: 'lax', secure: true })
  }
  return response
}
