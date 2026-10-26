export type CaptchaVerification = 'verified' | 'failed' | 'not-configured'

export async function verifySmartCaptcha(
  token: string,
  request: Request,
  env: Record<string, string | undefined> = process.env,
  send: typeof fetch = fetch,
): Promise<CaptchaVerification> {
  const secret = env.YANDEX_SMARTCAPTCHA_SECRET_KEY?.trim() || env.YANDEX_SMARTCAPTCHA_SERVER_KEY?.trim()
  if (!secret) return 'not-configured'
  try {
    const response = await send('https://smartcaptcha.yandexcloud.net/validate', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, token, ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '' }),
      signal: AbortSignal.timeout(5000), cache: 'no-store',
    })
    if (!response.ok) return 'failed'
    const result = await response.json() as { status?: string }
    return result.status === 'ok' ? 'verified' : 'failed'
  } catch { return 'failed' }
}
