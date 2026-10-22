import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export function GET() {
  const siteKey = process.env.NEXT_PUBLIC_YANDEX_CAPTCHA_KEY?.trim()
  if (!siteKey) {
    console.warn('[smartcaptcha] public site key is not configured')
    return NextResponse.json({ configured: false }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
  return NextResponse.json({ configured: true, siteKey }, { headers: { 'Cache-Control': 'no-store' } })
}
