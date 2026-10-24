import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Field } from 'payload'
import { projectCopyData } from '../src/config/project-copy'

test('project copy preserves content, JSON and media references but regenerates row and record identities', () => {
  const fields: Field[] = [
    { name: 'name', type: 'text' }, { name: 'desktopImage', type: 'upload', relationTo: 'media' },
    { name: 'code', type: 'text' }, { name: 'importKey', type: 'text' }, { name: 'hero_product', type: 'number' },
    { type: 'collapsible', label: 'Plans', fields: [{ name: 'plans', type: 'array', fields: [{ name: 'id', type: 'text' }, { name: 'floors', type: 'array', fields: [{ name: 'photo', type: 'upload', relationTo: 'media' }, { name: 'rooms', type: 'array', fields: [{ name: 'name', type: 'text' }, { name: 'area', type: 'text' }] }] }] }] },
    { name: 'legacyConfigurations', type: 'json' }, { name: 'likeCount', type: 'number' }, { name: 'likeVoters', type: 'json' },
  ]
  const source = { id: 1, name: 'Барнхаус 138', code: 'old', slug: 'barnhouse-138', desktopImage: 72, hero_product: 1, importKey: 'catalog:barnhouse-138', likeCount: 120, likeVoters: ['a'], legacyConfigurations: { id: 'content-id', nested: [1, 2] }, plans: [{ id: 'old-variant', floors: [{ id: 'old-floor', photo: 73, rooms: [{ id: 'old-room', name: 'Спальня', area: '18,5' }] }] }] }
  const copy = projectCopyData(fields, source, 'barnhouse-138-copy')
  assert.equal(copy.slug, 'barnhouse-138-copy'); assert.equal(copy._status, 'draft')
  assert.equal(copy.code, undefined); assert.equal(copy.id, undefined); assert.equal(copy.name, source.name)
  assert.equal(copy.desktopImage, 72); assert.equal(copy.importKey, null); assert.equal(copy.hero_product, null)
  assert.deepEqual(copy.plans, [{ floors: [{ photo: 73, rooms: [{ name: 'Спальня', area: '18,5' }] }] }])
  assert.deepEqual(copy.legacyConfigurations, source.legacyConfigurations)
  assert.notEqual(copy.legacyConfigurations, source.legacyConfigurations)
  assert.equal(copy.likeCount, 0); assert.deepEqual(copy.likeVoters, [])
  assert.equal(source.plans[0].id, 'old-variant')
})
