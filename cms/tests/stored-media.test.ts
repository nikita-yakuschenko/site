import assert from 'node:assert/strict'
import { test } from 'node:test'
import assets from '../../src/data/webp-assets.json'
import { optimizedSrc, optimizedSrcSet } from '../../src/lib/media'

test('local media keeps its pre-encoded stored files', () => {
  const [source, stored] = Object.entries(assets)[0]!
  assert.ok(source && stored, 'Run npm run images:prepare before tests')
  assert.match(stored, /\.webp$/)
  assert.equal(optimizedSrc(source, 384, 45), stored)
  assert.equal(optimizedSrc(source, 1920, 90), stored)
  assert.equal(optimizedSrcSet(source, [384, 828, 1920]), stored)
  assert.equal(optimizedSrc('/_next/image?url=' + encodeURIComponent(source) + '&w=640&q=75'), stored)
  assert.equal(optimizedSrc('/broken%name.jpg'), '/broken%name.jpg')
})

test('CMS photos use bounded responsive cached versions instead of full originals', () => {
  const source = 'https://cms.avgst.ru/api/media/file/photo.webp'
  const small = new URL(optimizedSrc(source, 384, 45), 'https://avgst.ru')
  assert.equal(small.pathname, '/_next/image')
  assert.equal(small.searchParams.get('url'), source)
  assert.equal(small.searchParams.get('w'), '384')
  assert.equal(small.searchParams.get('q'), '45')
  assert.notEqual(optimizedSrc(source, 384), optimizedSrc(source, 1920))
  assert.match(optimizedSrcSet(source, [384, 828], 60), /w=384&q=60 384w, .*w=828&q=60 828w$/)
  for (const source of ['https://example.com/photo.webp', 'https://cms.avgst.ru/api/media/file/logo.svg', 'https://cms.avgst.ru/api/media/file/video.mp4']) {
    assert.equal(optimizedSrc(source, 384), source)
  }
})
