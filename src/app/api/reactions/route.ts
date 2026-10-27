import { requirePublicRequestLimit, requestFailure } from '../../../lib/request-limits'
import { readJsonLimited } from '../../../lib/request-security'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { deviceKey, newVoterId, VOTER_COOKIE, VOTER_MAX_AGE, writeProjectReaction, type DeviceSignals } from '../../../lib/reactions'

export const dynamic = 'force-dynamic'

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: VOTER_MAX_AGE,
  }
}

export async function POST(request: Request) {
  try { await requirePublicRequestLimit(request, 'reactions') } catch (error) { return requestFailure(error) }
  let body: { slug?: unknown; action?: unknown; signals?: DeviceSignals }
  try { body = await readJsonLimited(request) as typeof body } catch (error) { return requestFailure(error) }
  const slug = typeof body.slug === 'string' ? body.slug : ''
  const action = body.action
  if (!slugPattern.test(slug) || (action !== 'like' && action !== 'unlike' && action !== 'share')) {
    return NextResponse.json({ error: 'bad-input' }, { status: 400 })
  }
  const secret = process.env.CMS_SITE_API_KEY
  if (!secret) return NextResponse.json({ error: 'not-configured' }, { status: 503 })
  const jar = await cookies()
  const voterId = jar.get(VOTER_COOKIE)?.value || newVoterId()
  const keys = action === 'share' ? [] : [`c:${voterId}`, deviceKey(request, body.signals, secret)]
  try {
    const counts = await writeProjectReaction(slug, action, keys)
    if (!counts) return NextResponse.json({ error: 'not-recorded' }, { status: 502 })
    const response = NextResponse.json(counts, { headers: { 'Cache-Control': 'no-store' } })
    if (action !== 'share') response.cookies.set(VOTER_COOKIE, voterId, cookieOptions())
    return response
  } catch {
    return NextResponse.json({ error: 'unavailable' }, { status: 502 })
  }
}
