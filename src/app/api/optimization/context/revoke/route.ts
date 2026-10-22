import { NextResponse } from 'next/server'
import { samePreferenceOrigin } from '../../../../../lib/optimization/preferences-server'
import { OPTIMIZATION_CONTEXT_COOKIE } from '../../../../../lib/optimization/server-context'
export async function POST(request: Request) {
  if (!samePreferenceOrigin(request)) return NextResponse.json({ error: 'origin' }, { status: 403 })
  const response = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'private, no-store' } })
  response.cookies.set(OPTIMIZATION_CONTEXT_COOKIE, '', { path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 0 })
  return response
}
