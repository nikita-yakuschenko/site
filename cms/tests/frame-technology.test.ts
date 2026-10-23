import assert from 'node:assert/strict'
import test from 'node:test'
import type { PayloadRequest } from 'payload'
import { projectCatalogEndpoint } from '../src/collections/project-catalog-endpoint'
import { catalogYml } from '../src/config/catalog-yml'
import type { Project } from '../src/payload-types'
import { parseFilters, filtersToHref } from '../../src/lib/catalog/filters'
import { FixtureCatalogProvider } from '../../src/lib/catalog/fixture-provider'
import { collectionHref, countCollectionProjects } from '../../src/lib/catalog/collection'
import { isProjectHeroData } from '../../src/lib/catalog/project-hero-data'
import { technologyFromBadge, technologyLabel, type CatalogProject } from '../../src/lib/catalog/types'
import { normalizeConfigurations } from '../src/config/project-configurations'

test('CMS сохраняет отдельную каркасную технологию в каталоге, фильтре, подборке и YML', async () => {
  const previousKey = process.env.CMS_SITE_API_KEY
  process.env.CMS_SITE_API_KEY = 'frame-technology-test-key-000000000000'
  const records = ['Каркасный', 'Панельно-каркасный', 'Модульный'].map((technologyBadge, index) => ({
    id: index + 1, code: `ТЕСТ-${index + 1}`, slug: `house-${index + 1}`, name: `Дом ${index + 1}`, technologyBadge,
    series: 'barn', areaValue: 80, floorsValue: 1, bedrooms: 2, bathrooms: 1,
    imageUrl: 'https://avgst.ru/house.jpg', priceAmount: 5000000, _status: 'published',
  })) as Project[]
  try {
    const req = {
      url: 'https://cms.example/api/projects/catalog',
      headers: new Headers({ authorization: `Bearer ${process.env.CMS_SITE_API_KEY}` }),
      payload: { find: async ({ collection }: { collection: string }) => ({ docs: collection === 'projects' ? records : [] }) },
    } as unknown as PayloadRequest
    const response = await projectCatalogEndpoint.handler(req)
    assert.equal(response.status, 200)
    const { items } = await response.json() as { items: CatalogProject[] }
    assert.deepEqual(items.map(item => item.technology), ['frame', 'panel', 'modular'])
    assert.equal(items[0].series, 'barn')
    assert.equal(items[0].technologyBadge, 'Каркасный')
    assert.equal(technologyLabel('Каркасный'), 'Каркасная')
    assert.equal(technologyFromBadge('Каркасный'), 'frame')
    assert.equal(technologyFromBadge('Панельно-каркасный'), 'panel')
    const filters = parseFilters({ tech: 'frame' })
    assert.deepEqual(filters.tech, ['frame'])
    assert.equal(filtersToHref(filters), '/catalog?tech=frame')
    const result = await new FixtureCatalogProvider(items).list({ siteCode: 'avgst', filters })
    assert.deepEqual(result.items.map(item => item.slug), ['house-1'])
    assert.equal(result.rest.length, 2)
    assert.equal(collectionHref('frame'), '/catalog?tech=frame')
    assert.equal(countCollectionProjects(items, 'frame'), 1)
    assert.equal(countCollectionProjects(items, 'panel'), 1)
    assert.equal(isProjectHeroData({ ...items[0], bedrooms: 2, bathrooms: 1, mobileImageUrl: null }), true)
    assert.deepEqual(normalizeConfigurations([], 'Каркасный').map(row => row.key), ['start', 'standard', 'project'])

    const feed = catalogYml(records, [])
    assert.equal(feed.count, 3)
    assert.equal(feed.skipped, 0)
    assert.match(feed.xml, /<categoryId>3<\/categoryId>/)
    assert.match(feed.xml, /<collectionId>timber-frame-houses<\/collectionId>/)
    assert.match(feed.xml, /https:\/\/avgst.ru\/catalog\?tech=frame/)
    assert.match(feed.xml, /<param name="Тип дома">Каркасный<\/param>/)
  } finally {
    if (previousKey === undefined) delete process.env.CMS_SITE_API_KEY
    else process.env.CMS_SITE_API_KEY = previousKey
  }
})
