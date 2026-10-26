import { NextResponse } from 'next/server'
import { allowLeadAttempt, leadInputSchema } from '../../../lib/leads'
import { leadAttribution } from '../../../lib/lead-attribution'
import { verifySmartCaptcha } from '../../../server/smartcaptcha'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  if (!allowLeadAttempt(request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local')) return NextResponse.json({ error: 'too-many-attempts' }, { status: 429 })
  let input
  try { input = leadInputSchema.safeParse(await request.json()) } catch { return NextResponse.json({ error: 'invalid-input' }, { status: 400 }) }
  if (!input.success || !input.data.formId || !input.data.captchaToken) return NextResponse.json({ error: 'invalid-input' }, { status: 400 })
  const captcha = await verifySmartCaptcha(input.data.captchaToken, request)
  if (captcha === 'not-configured') {
    console.error('[smartcaptcha] server secret is not configured')
    return NextResponse.json({ error: 'captcha-not-configured' }, { status: 503 })
  }
  if (captcha !== 'verified') return NextResponse.json({ error: 'captcha-failed' }, { status: 403 })
  const { captchaToken: _captchaToken, ...lead } = input.data
  if (!lead.sourceUrl) lead.sourceUrl = request.headers.get('referer')?.slice(0, 2000) || undefined
  lead.meta = { ...lead.meta, ...leadAttribution(lead.sourceUrl, request.headers.get('cookie') || '') }
  const key = process.env.CMS_SITE_API_KEY
  if (!key) return NextResponse.json({ error: 'integration-not-configured' }, { status: 503 })
  try {
    const origin = process.env.CMS_PUBLIC_URL || (process.env.NODE_ENV === 'production' ? 'https://cms.avgst.ru' : 'http://localhost:3001')
    const response = await fetch(origin + '/api/lead-submissions/submit', { method: 'POST', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, body: JSON.stringify(lead), signal: AbortSignal.timeout(15000), cache: 'no-store' })
    if (!response.ok) return NextResponse.json({ error: 'delivery-failed' }, { status: response.status === 503 ? 503 : 502 })
    return NextResponse.json(await response.json(), { headers: { 'Cache-Control': 'no-store' } })
  } catch { return NextResponse.json({ error: 'delivery-unavailable' }, { status: 502 }) }
}
