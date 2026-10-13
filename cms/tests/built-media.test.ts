import assert from 'node:assert/strict'
import test from 'node:test'
import { parseBuiltVideo, resolveBuiltItems } from '../src/config/built-media'

test('video links must match the selected platform and reject arbitrary iframe origins', () => {
  assert.deepEqual(parseBuiltVideo('kinescope', 'https://kinescope.io/embed/abc-123'), { provider: 'kinescope', id: 'abc-123' })
  assert.deepEqual(parseBuiltVideo('vk', 'https://vkvideo.ru/video-123_456'), { provider: 'vk', oid: -123, id: '456' })
  assert.deepEqual(parseBuiltVideo('vk', 'https://vk.com/video_ext.php?oid=-123&id=456'), { provider: 'vk', oid: -123, id: '456' })
  for (const url of ['javascript:alert(1)', 'https://vk.com.evil.com/video-123_456', 'https://user:pass@vk.com/video-123_456', 'http://vk.com/video-123_456', 'https://vk.com/video999999999999999999999_1']) assert.equal(parseBuiltVideo('vk', url), null)
  assert.equal(parseBuiltVideo('vk', 'https://kinescope.io/abc'), null)
})

test('mixed records preserve order and allow video without a cover', async () => {
  const items = await resolveBuiltItems([{ type: 'video', provider: 'vk', videoUrl: 'https://vk.com/video-1_2' }, { type: 'photo', photo: 4, caption: 'Дом' }, { type: 'video', provider: 'kinescope', videoUrl: 'https://kinescope.io/abc', photo: 5 }, { type: 'photo' }], async id => `/media/${id}.jpg`)
  assert.deepEqual(items, [{ type: 'video', video: { provider: 'vk', oid: -1, id: '2' }, cover: undefined, caption: undefined }, { type: 'photo', image: '/media/4.jpg', caption: 'Дом' }, { type: 'video', video: { provider: 'kinescope', id: 'abc' }, cover: '/media/5.jpg', caption: undefined }])
})

test('selected main record leads the gallery without reordering the remaining records', async () => {
  const rows = [{ type: 'photo', photo: 1 }, { type: 'video', provider: 'vk', videoUrl: 'https://vk.com/video-1_2', isPrimary: true }, { type: 'photo', photo: 3 }]
  const items = await resolveBuiltItems(rows, async id => `/media/${id}.jpg`)
  assert.deepEqual(items.map(item => item.type === 'photo' ? item.image : item.video.provider), ['vk', '/media/1.jpg', '/media/3.jpg'])
  const fallback = await resolveBuiltItems(rows.filter(row => !row.isPrimary), async id => `/media/${id}.jpg`)
  assert.deepEqual(fallback.map(item => item.type === 'photo' ? item.image : item.video.provider), ['/media/1.jpg', '/media/3.jpg'])
})
