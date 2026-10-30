import test from 'node:test'
import assert from 'node:assert/strict'
import { createIPRegionResolver, visitorIPv4 } from '../../src/server/ip-region'
const geo = (region: string, country = 'RU') => ({ country: { iso: country }, region: { iso: region } })

test('only the trusted last forwarded IPv4 is used; unknown, private, reserved and unsupported IPs stay unknown', () => {
  const headers = (value: string) => new Headers({ 'x-forwarded-for': value })
  assert.equal(visitorIPv4(headers('8.8.8.8, 1.1.1.1')), '1.1.1.1')
  assert.equal(visitorIPv4(headers('::ffff:1.1.1.1')), '1.1.1.1')
  for (const ip of ['', '::1', '2001:4860:4860::8888', '127.0.0.1', '10.0.0.1', '192.168.1.1', '172.16.1.1', '100.64.1.1', '169.254.0.1', '192.0.2.1', '198.51.100.1', '203.0.113.1', '224.1.1.1', '8.8.8.8, invalid']) assert.equal(visitorIPv4(headers(ip)), null)
  assert.equal(visitorIPv4(new Headers({ 'x-real-ip': '8.8.8.8' })), null)
})
test('lookup cache shares concurrent requests, expires and never guesses on provider failure', async () => {
  let calls = 0, clock = 1000
  const send = async () => { calls++; return Response.json(geo('RU-MOS')) }
  const resolve = createIPRegionResolver(send as typeof fetch, () => clock)
  const headers = new Headers({ 'x-forwarded-for': '8.8.8.8' })
  assert.deepEqual(await Promise.all([resolve(headers), resolve(headers)]), ['msk','msk'])
  assert.equal(calls, 1)
  clock += 24 * 60 * 60_000 + 1
  assert.equal(await resolve(headers), 'msk'); assert.equal(calls, 2)
  assert.equal(await resolve(new Headers()), null)
  assert.equal(await resolve(new Headers({ 'x-forwarded-for': '1.1.1.1', 'user-agent': 'TelegramBot' })), null)
  assert.equal(calls, 2)
  for (const failure of [async () => { throw Error('timeout') }, async () => new Response('', {status:429}), async () => new Response('not JSON'), async () => Response.json({})]) assert.equal(await createIPRegionResolver(failure as typeof fetch)(headers), null)
})
