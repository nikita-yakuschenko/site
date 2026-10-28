import test from 'node:test'
import assert from 'node:assert/strict'
import { expectedCMSImageOptimization, runtimeSeverity } from '../model.ts'

const origin = 'http://127.0.0.1:3000'
const cms = 'https://cms.avgst.ru/api/media/file/photo.webp'
const request = (source = cms, width = '640', quality = '75') => `${origin}/_next/image?${new URLSearchParams({ url: source, w: width, q: quality })}`

test('responsive CMS photos use the existing bounded optimizer contract', () => {
  assert.equal(expectedCMSImageOptimization(request(), origin), true)
  assert.equal(expectedCMSImageOptimization(request(cms, '1920', '85'), origin), true)
})

test('local assets and all other sources remain blocking optimizer findings', () => {
  for (const source of ['/img/photo.png', '/generated/webp/photo.webp', 'https://other.test/photo.webp', 'https://cms.avgst.ru.evil.test/api/media/file/photo.webp', 'https://cms.avgst.ru/other/photo.webp', 'http://cms.avgst.ru/api/media/file/photo.webp', 'https://cms.avgst.ru/api/media/file/photo.svg', cms + '?download=1', cms + '#section']) {
    assert.equal(expectedCMSImageOptimization(request(source), origin), false, source)
  }
  assert.equal(runtimeSeverity('runtime-image-optimizer', false, origin, origin), 'critical')
})

test('unbounded sizes, qualities and altered query contracts are rejected', () => {
  for (const url of [request(cms, '99999'), request(cms, '640', '1'), request() + '&w=1920', request() + '&extra=1', request().replace('q=75', ''), request().replace(origin, 'https://other.test'), 'invalid']) {
    assert.equal(expectedCMSImageOptimization(url, origin), false, url)
  }
})
