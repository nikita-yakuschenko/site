import assert from 'node:assert/strict'
import test from 'node:test'
import { captchaProviderSource, cancelledImageConsole, groupFindings, navigationCancellation, runtimeSeverity, scenarioKey, webkitNavigationFetch } from '../model.ts'

test('frequency counts scenario runs, preserves browser/device profiles and repeated events', () => {
  const finding = { scenario: 'form', browser: 'webkit', fingerprint: 'same', severity: 'critical' }
  const runs = [
    { scenario: 'form @critical', browser: 'webkit-desktop', findings: [finding, finding] },
    { scenario: 'form @critical', browser: 'webkit-desktop', findings: [] },
    { scenario: 'form @critical', browser: 'webkit-mobile', findings: [finding] },
  ]
  const groups = groupFindings(runs)
  assert.equal(groups.length, 2)
  assert.equal(groups[0].syntheticFrequency, 0.5)
  assert.equal(groups[0].reproductions, 2)
  assert.equal(groups[1].syntheticFrequency, 1)
  assert.equal(scenarioKey('form @critical'), 'form')
  assert.deepEqual(groupFindings([]), [])
})

test('WebKit same-origin fetch errors remain critical outside navigation and for cross-origin failures', () => {
  const message = '/127.0.0.1:3000/api/smartcaptcha-config due to access control checks.'
  const stack = 'Fetch API cannot load http://127.0.0.1:3000/api/smartcaptcha-config due to access control checks.\n at fetch'
  const classify = (browser, navigating, origin) => webkitNavigationFetch(message, stack, browser, navigating, origin)
  assert.equal(classify('webkit-mobile', true, 'http://127.0.0.1:3000'), true)
  assert.equal(classify('webkit-mobile', false, 'http://127.0.0.1:3000'), false)
  assert.equal(classify('chromium-mobile', true, 'http://127.0.0.1:3000'), false)
  assert.equal(classify('webkit-mobile', true, 'https://avgst.ru'), false)
})

test('WebKit cancellation is ignored only during document navigation', () => {
  assert.equal(navigationCancellation('Load request cancelled', true), true)
  assert.equal(navigationCancellation('Load request cancelled', false), false)
  assert.equal(navigationCancellation('net::ERR_CONNECTION_REFUSED', true), false)
  assert.equal(navigationCancellation('NS_BINDING_ABORTED', true), true)
})

test('a Firefox decode message requires a matching recent image cancellation', () => {
  assert.equal(cancelledImageConsole('firefox-desktop', 'Image corrupt or truncated.', 20), true)
  assert.equal(cancelledImageConsole('firefox-desktop', 'Image corrupt or truncated.', -20), true)
  assert.equal(cancelledImageConsole('firefox-desktop', 'Image corrupt or truncated.'), false)
  assert.equal(cancelledImageConsole('firefox-desktop', 'Image corrupt or truncated.', 1000), false)
  assert.equal(cancelledImageConsole('chromium-desktop', 'Image corrupt or truncated.', 20), false)
})

 test('provider requires exact trusted URL, not captcha text or lookalike hostname', () => {
  assert.equal(captchaProviderSource('https://smartcaptcha.cloud.yandex.ru/react.js'), true)
  assert.equal(captchaProviderSource('https://avgst.ru/_next/captcha.js'), false)
  assert.equal(captchaProviderSource('https://smartcaptcha.cloud.yandex.ru.evil.test/react.js'), false)
  assert.equal(captchaProviderSource('captcha React error #418'), false)
 })

test('provider recovery is visible, app hydration and functional failures remain blocking', () => {
  const origin = 'https://avgst.ru'
  assert.equal(runtimeSeverity('exception', true, origin + '/_next/react.js', origin), 'critical')
  assert.equal(runtimeSeverity('exception', true, '', origin), 'critical')
  assert.equal(runtimeSeverity('exception', true, 'https://smartcaptcha.cloud.yandex.ru/react.js', origin), 'warning')
  assert.equal(runtimeSeverity('scenario-failure', false, 'https://smartcaptcha.cloud.yandex.ru/react.js', origin), 'critical')
  assert.equal(runtimeSeverity('exception', true, origin + '/captcha.js', origin), 'critical')
})
