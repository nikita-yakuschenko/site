import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const response = NextResponse.next()
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')

  const isAdmin = pathname.startsWith('/admin') || pathname.startsWith('/api')
  if (!isAdmin) {
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; img-src 'self' https: data: blob:; media-src 'self' https: blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self'; frame-ancestors 'self'",
    )
  }

  const preview = request.cookies.has('__prerender_bypass')
  if (preview) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow')
  }
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
