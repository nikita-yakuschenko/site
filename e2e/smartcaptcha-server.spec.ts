import { test, expect } from '@playwright/test'
import { verifySmartCaptcha } from '../src/server/smartcaptcha'

test('server accepts both secret names and distinguishes missing configuration', async () => {
  const request = new Request('https://avgst.ru/next/leads', { headers: { 'x-forwarded-for': '192.0.2.1' } })
  let calls = 0
  const send: typeof fetch = async (_url, init) => {
    calls++
    const body = new URLSearchParams(String(init?.body))
    expect(body.get('secret')).toBe('test-secret')
    expect(body.get('token')).toBe('test-token')
    expect(body.get('ip')).toBe('192.0.2.1')
    return Response.json({ status: 'ok' })
  }
  expect(await verifySmartCaptcha('test-token', request, {}, send)).toBe('not-configured')
  expect(calls).toBe(0)
  for (const key of ['YANDEX_SMARTCAPTCHA_SECRET_KEY', 'YANDEX_SMARTCAPTCHA_SERVER_KEY', 'NEXT_PUBLIC_YANDEX_CAPTCHA_SERVER_KEY']) {
    expect(await verifySmartCaptcha('test-token', request, { [key]: 'test-secret' }, send)).toBe('verified')
  }
  expect(calls).toBe(3)
  // Публичный ключ не используется как секретный.
  expect(await verifySmartCaptcha('test-token', request, { NEXT_PUBLIC_YANDEX_CAPTCHA_KEY: 'public-only' }, send)).toBe('not-configured')
  expect(calls).toBe(3)
})

test('provider failure or unavailable validation never accepts the token', async () => {
  const request = new Request('https://avgst.ru/next/leads')
  const env = { YANDEX_SMARTCAPTCHA_SECRET_KEY: 'test-secret' }
  for (const send of [
    async () => Response.json({ status: 'failed' }),
    async () => Response.json({ status: 'ok' }, { status: 500 }),
    async () => { throw new Error('unavailable') },
  ]) {
    expect(await verifySmartCaptcha('test-token', request, env, send)).toBe('failed')
  }
})
