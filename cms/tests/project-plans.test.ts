import test from 'node:test'
import assert from 'node:assert/strict'
import { floorName, normalizePlans, validRoomArea } from '../src/config/project-plans'
import { isPlanVariants } from '../../src/lib/catalog/project-plans-data'

test('one storey plans migrate with their own explication', () => {
  const rooms = [{ name: 'Кухня', area: '12,5' }]
  const [variant] = normalizePlans([{ label: 'С кухней', image: '/plan.jpg', rooms }])
  assert.deepEqual(variant.floors[0].rooms, rooms)
  assert.equal(variant.floors[0].image, '/plan.jpg')
  assert.equal(variant.image, null)
  assert.deepEqual(variant.rooms, [])
})
test('floor names are automatic with optional exceptions', () => {
  assert.equal(floorName(null, 0), '1 этаж')
  assert.equal(floorName('', 1), '2 этаж')
  assert.equal(floorName('Мансарда', 1), 'Мансарда')
})
test('uploaded floor replaces legacy path and keeps its explication', () => {
  const [variant] = normalizePlans([{ floors: [{ photo: 15, image: '/old.jpg', rooms: [{ name: 'Спальня', area: '10' }] }] }])
  assert.equal(variant.floors[0].image, null)
  assert.equal(variant.floors[0].photo, 15)
  assert.equal(variant.floors[0].rooms.length, 1)
})
test('public plans cannot contain an image without explication', () => {
  assert.equal(isPlanVariants([{ label: 'Вариант 1', floors: [{ label: '1 этаж', image: '/plan.jpg', rooms: [] }] }]), false)
  assert.equal(validRoomArea('0'), false)
  assert.equal(validRoomArea('-3'), false)
  assert.equal(validRoomArea('12,5 м²'), true)
})
