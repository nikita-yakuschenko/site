import assert from 'node:assert/strict'
import test from 'node:test'
import type { Project, ProjectPrice } from '../src/payload-types'
import { catalogVkYml, vkOfferPictures } from '../src/config/catalog-vk-yml'
import { projectYmlFeedEndpoint, ymlFeedUrl } from '../src/collections/project-yml-endpoint'
import type { PayloadRequest } from 'payload'

const p = (overrides: Partial<Project> = {}) => ({
  id: 1,
  name: 'Барнхаус 76',
  slug: 'barnhouse-76',
  _status: 'published',
  technologyBadge: 'Модульный',
  areaValue: 76,
  bedrooms: 2,
  bathrooms: 1,
  floorsValue: 1,
  imageUrl: '/main.jpg',
  exteriors: [
    { image: '/facade-1.jpg', isPrimary: true },
    { image: '/facade-2.jpg' },
    { image: '/facade-3.jpg' },
    { image: '/facade-4.jpg' },
  ],
  interiors: [{ image: '/int-1.jpg' }, { image: '/int-2.jpg' }, { image: '/int-3.jpg' }, { image: '/int-4.jpg' }],
  plans: [{ floors: [{ image: '/plan.jpg', rooms: [{ name: 'Холл', area: '5' }] }] }],
  ...overrides,
} as Project)

const price = { project: 1, configuration: 'standard', region: 'nn', price: 2864000 } as ProjectPrice

test('vk pictures: main, up to three facades, up to three interiors, plan last', () => {
  assert.deepEqual(vkOfferPictures(p(), 'https://cms.avgst.ru'), [
    'https://cms.avgst.ru/main.jpg',
    'https://cms.avgst.ru/facade-1.jpg',
    'https://cms.avgst.ru/facade-2.jpg',
    'https://cms.avgst.ru/facade-3.jpg',
    'https://cms.avgst.ru/int-1.jpg',
    'https://cms.avgst.ru/int-2.jpg',
    'https://cms.avgst.ru/int-3.jpg',
    'https://cms.avgst.ru/plan.jpg',
  ])
})

test('vk yml keeps mortgage standard price, at most two params and no html leftovers', () => {
  const result = catalogVkYml([p({ searchDescription: 'Дом <b>тёплый</b> & уютный' })], [price], new Date('2026-11-16T10:00:00Z'), 'https://cms.avgst.ru', 'nn')
  assert.equal(result.count, 1)
  assert.match(result.xml, /<price>2864000<\/price>/)
  assert.match(result.xml, /Дом тёплый &amp; уютный/)
  assert.doesNotMatch(result.xml, /<b>/)
  assert.equal([...result.xml.matchAll(/<param /g)].length, 2)
  assert.equal([...result.xml.matchAll(/<picture>/g)].length, 8)
  assert.match(result.xml, /plan\.jpg<\/picture>\n      <name>/)
})

test('vk feed url and endpoint only for nn/msk', async () => {
  const previous = process.env.CMS_YML_FEED_TOKEN
  const previousUrl = process.env.CMS_PUBLIC_URL
  process.env.CMS_YML_FEED_TOKEN = 'feed-token-for-tests-32chars-min!!'
  process.env.CMS_PUBLIC_URL = 'https://cms.avgst.ru'
  try {
    assert.ok(ymlFeedUrl('nn', 'vk')?.includes('channel=vk'))
    assert.equal(ymlFeedUrl('dealer', 'vk'), null)
    const calls: Record<string, unknown>[] = []
    const req = {
      url: 'http://cms.test/api/projects/yml?kind=nn&channel=vk&token=feed-token-for-tests-32chars-min!!',
      payload: {
        find: async (args: Record<string, unknown>) => {
          calls.push(args)
          return { docs: args.collection === 'projects' ? [p()] : [price] }
        },
        logger: { error: () => {} },
      },
    } as unknown as PayloadRequest
    const response = await projectYmlFeedEndpoint.handler(req)
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('Content-Disposition'), null)
    const body = await response.text()
    assert.match(body, /barnhouse-76/)
    assert.match(body, /<picture>/)
    assert.ok(calls.some(call => call.collection === 'projects' && call.depth === 2))
    const denied = await projectYmlFeedEndpoint.handler({
      ...req,
      url: 'http://cms.test/api/projects/yml?kind=dealer&channel=vk&token=feed-token-for-tests-32chars-min!!',
    } as unknown as PayloadRequest)
    assert.equal(denied.status, 400)
  } finally {
    if (previous === undefined) delete process.env.CMS_YML_FEED_TOKEN
    else process.env.CMS_YML_FEED_TOKEN = previous
    if (previousUrl === undefined) delete process.env.CMS_PUBLIC_URL
    else process.env.CMS_PUBLIC_URL = previousUrl
  }
})
