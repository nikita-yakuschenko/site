import assert from 'node:assert/strict'
import test from 'node:test'
import type { PayloadRequest } from 'payload'
import { storiesFeedEndpoint } from '../src/collections/stories-feed-endpoint'

test('published stories expose catalogue facts, project photo and project link without prices', async t => {
  const original = process.env.CMS_SITE_API_KEY
  const key = 'story-feed-test-key-not-a-secret-123456789'
  process.env.CMS_SITE_API_KEY = key
  t.after(() => { if (original === undefined) delete process.env.CMS_SITE_API_KEY; else process.env.CMS_SITE_API_KEY = original })
  const base = { heading: 'История семьи', place: 'Нижний Новгород', year: 2026, customerKind: 'family', media: [], _status: 'published' }
  const req = {
    headers: new Headers({ authorization: `Bearer ${key}` }),
    payload: { find: async (query: { where: unknown; depth: number }) => {
      assert.deepEqual(query.where, { _status: { equals: 'published' } })
      assert.equal(query.depth, 2)
      return { docs: [
        { ...base, slug: 'catalog-story', binding: 'catalog', project: { name: 'Шведский 161', slug: 'shvedskii-161', areaValue: 161, floorsValue: 1, bedrooms: 4, bathrooms: 2, priceAmount: 6824000, desktopImage: { url: '/project-photo.jpg' } } },
        { ...base, slug: 'custom-story', binding: 'individual', relatedCard: { enabled: false } },
        { ...base, slug: 'missing-project', binding: 'catalog', project: null },
        { ...base, slug: 'studio-story', binding: 'catalog', project: { name: 'Студия', slug: 'studio', areaValue: 25, floorsValue: 1, bedrooms: 0, bathrooms: null } },
      ] }
    } },
  } as unknown as PayloadRequest
  const response = await storiesFeedEndpoint.handler(req)
  assert.equal(response.status, 200)
  const { items } = await response.json()
  assert.deepEqual(items[0].card.project, { area: 161, floors: 1, bedrooms: 4, bathrooms: 2 })
  assert.equal(items[0].card.href, '/catalog/shvedskii-161')
  assert.equal(items[0].card.label, 'Посмотреть проект')
  assert.match(items[0].card.image, /\/project-photo\.jpg$/)
  assert.equal(JSON.stringify(items).includes('6824000'), false)
  assert.equal(items[1].card, null)
  assert.equal(items[2].card, null)
  assert.equal(items[3].card.project.bedrooms, 0)
  assert.equal(items[3].card.project.bathrooms, null)
})
