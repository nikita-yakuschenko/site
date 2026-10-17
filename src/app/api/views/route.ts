import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export async function POST(request: Request) {
  let body: { slug?: unknown }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'bad-json' }, { status: 400 }) }
  const slug = typeof body.slug === 'string' ? body.slug : ''
  if (!slugPattern.test(slug)) return NextResponse.json({ error: 'bad-input' }, { status: 400 })
  const key = process.env.CMS_SITE_API_KEY
  if (!key) return NextResponse.json({ error: 'not-configured' }, { status: 503 })
  const origin = process.env.CMS_PUBLIC_URL || (process.env.NODE_ENV === 'production' ? 'https://cms.avgst.ru' : 'http://localhost:3001')
  try {
    const response = await fetch(`${origin}/api/projects/views`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug }),
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) return NextResponse.json({ error: 'not-recorded' }, { status: 502 })
    return NextResponse.json(await response.json(), { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'unavailable' }, { status: 502 })
  }
}
