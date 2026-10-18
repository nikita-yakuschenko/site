import { NextResponse, type NextRequest } from 'next/server'

const pretty = new Set(['blocks', 'forms', 'media', 'users'])

export function middleware(request: NextRequest) {
  const match = request.nextUrl.pathname.match(/^\/collections\/(blocks|forms|media|users)(\/.*)?$/)
  if (!match || !pretty.has(match[1])) return NextResponse.next()
  const url = request.nextUrl.clone()
  url.pathname = `/${match[1]}${match[2] ?? ''}`
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/collections/blocks', '/collections/blocks/:path*', '/collections/forms', '/collections/forms/:path*', '/collections/media', '/collections/media/:path*', '/collections/users', '/collections/users/:path*'],
}
