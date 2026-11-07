import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mediaFitTarget } from '../src/config/media-fit'

test('fit accepts only the shared frame widths and a file name', () => {
  assert.deepEqual(mediaFitTarget('828', 'house.webp'), { width: 828, sourceName: 'house.webp' })
  assert.deepEqual(mediaFitTarget('384', 'plan%20a.jpeg'), { width: 384, sourceName: 'plan a.jpeg' })
  assert.equal(mediaFitTarget('60', 'house.webp'), null)
  assert.equal(mediaFitTarget('9999', 'house.webp'), null)
  assert.equal(mediaFitTarget('828', '../house.webp'), null)
  assert.equal(mediaFitTarget('828', 'dir/house.webp'), null)
  assert.equal(mediaFitTarget('828', 'clip.mp4'), null)
})
