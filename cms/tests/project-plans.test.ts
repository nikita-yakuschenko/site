import test from 'node:test'
import assert from 'node:assert/strict'
import { floorName, normalizePlans, validRoomArea, variantName } from '../src/config/project-plans'
import { isPlanVariants } from '../../src/lib/catalog/project-plans-data'

test('one storey plans migrate with their own explication', () => {
  const rooms = [{ name: 'Кухня', area: '12,5' }]
  const [variant] = normalizePlans([{ label: 'С кухней', image: '/plan.jpg', rooms }])
  assert.deepEqual(variant.floors[0].rooms, rooms)
  assert.equal(variant.floors[0].image, '/plan.jpg')
  assert.equal(variant.image, null)
  assert.deepEqual(variant.rooms, [])
})
test('variant and floor names are positional', () => {
  assert.equal(variantName(0), 'Вариант А')
  assert.equal(variantName(2), 'Вариант В')
  assert.equal(floorName(null, 0), '1 этаж')
  assert.equal(floorName('Мансарда', 1), '2 этаж')
})
test('uploaded floor replaces legacy path and keeps its explication', () => {
  const [variant] = normalizePlans([{ floors: [{ photo: 'PLAN15AB', image: '/old.jpg', rooms: [{ name: 'Спальня', area: '10' }] }] }])
  assert.equal(variant.floors[0].image, null)
  assert.equal(variant.floors[0].photo, 'PLAN15AB')
  assert.equal(variant.floors[0].rooms.length, 1)
})
test('public plans cannot contain an image without explication', () => {
  assert.equal(isPlanVariants([{ label: 'Вариант 1', floors: [{ label: '1 этаж', image: '/plan.jpg', rooms: [] }] }]), false)
  assert.equal(validRoomArea('0'), false)
  assert.equal(validRoomArea('-3'), false)
  assert.equal(validRoomArea('12,5 м²'), true)
})
