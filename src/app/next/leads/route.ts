import { NextResponse } from 'next/server'
import { allowLeadAttempt, leadInputSchema } from '../../../lib/leads'
export const dynamic = 'force-dynamic'
export async function POST(request: Request) {
  if (!allowLeadAttempt(request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local')) return NextResponse.json({ error: 'too-many-attempts' }, { status: 429 })
  let input
  try { input = leadInputSchema.safeParse(await request.json()) } catch { return NextResponse.json({ error: 'invalid-input' }, { status: 400 }) }
  if (!input.success || !input.data.formId) return NextResponse.json({ error: 'invalid-input' }, { status: 400 })
  // Номер визита Roistat связывает заявку с рекламным источником.
  const roistatVisit = /(?:^|;\s*)roistat_visit=([\w-]{1,64})(?:;|$)/.exec(request.headers.get('cookie') || '')?.[1]
  if (roistatVisit) input.data.meta = { ...input.data.meta, roistatVisit }
  const key = process.env.CMS_SITE_API_KEY
  if (!key) return NextResponse.json({ error: 'integration-not-configured' }, { status: 503 })
  try {
    const origin = process.env.CMS_PUBLIC_URL || (process.env.NODE_ENV === 'production' ? 'https://cms.avgst.ru' : 'http://localhost:3001')
    const response = await fetch(origin + '/api/lead-submissions/submit', { method: 'POST', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, body: JSON.stringify(input.data), signal: AbortSignal.timeout(15000), cache: 'no-store' })
    if (!response.ok) return NextResponse.json({ error: 'delivery-failed' }, { status: response.status === 503 ? 503 : 502 })
    return NextResponse.json(await response.json(), { headers: { 'Cache-Control': 'no-store' } })
  } catch { return NextResponse.json({ error: 'delivery-unavailable' }, { status: 502 }) }
}
