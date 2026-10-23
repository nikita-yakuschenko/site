import assert from 'node:assert/strict'
import { test } from 'node:test'
import assets from '../../src/data/webp-assets.json'
import { optimizedSrc, optimizedSrcSet } from '../../src/lib/media'

test('site media points to stored files at every requested size without a runtime optimizer', () => {
  const [source, stored] = Object.entries(assets)[0]!
  assert.ok(source && stored, 'Run npm run images:prepare before tests')
  assert.match(stored, /\.webp$/)
  assert.equal(optimizedSrc(source, 384, 45), stored)
  assert.equal(optimizedSrc(source, 1920, 90), stored)
  assert.equal(optimizedSrcSet(source, [384, 828, 1920]), stored)
  assert.equal(optimizedSrc('/_next/image?url=' + encodeURIComponent(source) + '&w=640&q=75'), stored)
  assert.equal(optimizedSrc('https://cms.avgst.ru/api/media/file/photo.webp', 384), 'https://cms.avgst.ru/api/media/file/photo.webp')
  assert.equal(optimizedSrc('/broken%name.jpg'), '/broken%name.jpg')
})
