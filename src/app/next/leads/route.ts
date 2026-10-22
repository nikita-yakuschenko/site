import { NextResponse } from 'next/server'
import { allowLeadAttempt, leadInputSchema } from '../../../lib/leads'
import { leadAttribution } from '../../../lib/lead-attribution'
export const dynamic = 'force-dynamic'

async function verifySmartCaptcha(token: string, request: Request) {
  const secret = process.env.YANDEX_SMARTCAPTCHA_SECRET_KEY?.trim()
  if (!secret) {
    console.error('[smartcaptcha] server secret is not configured')
    return false
  }
  try {
    const response = await fetch('https://smartcaptcha.yandexcloud.net/validate', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, token, ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '' }),
      signal: AbortSignal.timeout(5000), cache: 'no-store',
    })
    if (!response.ok) return false
    const result = await response.json() as { status?: string }
    return result.status === 'ok'
  } catch { return false }
}

export async function POST(request: Request) {
  if (!allowLeadAttempt(request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local')) return NextResponse.json({ error: 'too-many-attempts' }, { status: 429 })
  let input
  try { input = leadInputSchema.safeParse(await request.json()) } catch { return NextResponse.json({ error: 'invalid-input' }, { status: 400 }) }
  if (!input.success || !input.data.formId) return NextResponse.json({ error: 'invalid-input' }, { status: 400 })
  if (!await verifySmartCaptcha(input.data.captchaToken, request)) return NextResponse.json({ error: 'captcha-failed' }, { status: 403 })
  if (!input.data.sourceUrl) input.data.sourceUrl = request.headers.get('referer')?.slice(0, 2000) || undefined
  input.data.meta = { ...input.data.meta, ...leadAttribution(input.data.sourceUrl, request.headers.get('cookie') || '') }
  const key = process.env.CMS_SITE_API_KEY
  if (!key) return NextResponse.json({ error: 'integration-not-configured' }, { status: 503 })
  try {
    const origin = process.env.CMS_PUBLIC_URL || (process.env.NODE_ENV === 'production' ? 'https://cms.avgst.ru' : 'http://localhost:3001')
    const response = await fetch(origin + '/api/lead-submissions/submit', { method: 'POST', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, body: JSON.stringify(input.data), signal: AbortSignal.timeout(15000), cache: 'no-store' })
    if (!response.ok) return NextResponse.json({ error: 'delivery-failed' }, { status: response.status === 503 ? 503 : 502 })
    return NextResponse.json(await response.json(), { headers: { 'Cache-Control': 'no-store' } })
  } catch { return NextResponse.json({ error: 'delivery-unavailable' }, { status: 502 }) }
}
