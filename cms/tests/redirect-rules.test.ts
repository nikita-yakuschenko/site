import assert from 'node:assert/strict'
import test from 'node:test'
import { redirectPath, redirectTarget } from '../../src/lib/redirect-rules'

test('old site links normalize into paths, while external and service addresses are rejected', () => {
  assert.equal(redirectPath('https://avgst.ru/catalog/swened-135/', true), '/catalog/swened-135')
  assert.equal(redirectPath('/catalog?tech=panel'), '/catalog?tech=panel')
  assert.equal(redirectPath('/catalog?tech=panel', true), '/catalog?tech=panel')
  for (const source of ['//evil.test/abc', '/api/leads', '/next/leads', '/catalog?tech=panel&tech=frame', '/catalog#x', '/catalog/:slug*']) assert.throws(() => redirectPath(source, true))
  for (const target of ['https://evil.test/', 'javascript:alert(1)', '/\\evil.test', '/catalog/[slug]']) assert.throws(() => redirectPath(target))
})

test('exact aliases resolve chains and preserve attribution with explicit target filters taking priority', () => {
  const rules = [{ source: '/old', target: '/intermediate?tech=panel' }, { source: '/intermediate', target: '/catalog?tech=modular' }]
  assert.equal(redirectTarget('/old?utm_source=yandex&yclid=123&tech=panel', rules), '/catalog?tech=modular&utm_source=yandex&yclid=123')
  assert.equal(redirectTarget('/other', rules), null)
  assert.equal(redirectTarget('/old', []), null)
})

test('direct and indirect loops fail without publishing a broken redirect', () => {
  assert.throws(() => redirectTarget('/same', [{ source: '/same', target: '/same?x=1' }]), /цикл/)
  assert.throws(() => redirectTarget('/a', [{ source: '/a', target: '/b' }, { source: '/b', target: '/a' }]), /цикл/)
})

test('query conditions preserve attribution, prefer specific rules and do not redirect other filters', () => {
  const rules = [{ source: '/catalog?tech=panel', target: '/catalog?tech=frame' }]
  assert.equal(redirectTarget('/catalog?tech=panel&utm_source=yandex&region=msk', rules), '/catalog?tech=frame&utm_source=yandex&region=msk')
  for (const source of ['/catalog', '/catalog?tech=frame', '/catalog?tech=modular', '/catalog/house?tech=panel', '/catalog?tech=panel&tech=frame']) assert.equal(redirectTarget(source, rules), null)
  assert.equal(redirectTarget('/catalog?tech=panel', [{ source: '/catalog', target: '/fallback' }, { source: '/catalog?tech=panel', target: '/specific' }]), '/specific?tech=panel')
  assert.throws(() => redirectTarget('/catalog?tech=panel', [...rules, { source: '/catalog?tech=frame', target: '/catalog?tech=panel' }]), /цикл/)
})
