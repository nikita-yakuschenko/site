import assert from 'node:assert/strict'
import test from 'node:test'
import type { PayloadRequest } from 'payload'
import { projectConfigurationsEndpoint } from '../src/collections/project-configurations-endpoint'
import { normalizeConfigurations } from '../src/config/project-configurations'
import { configurationTiers } from '../../src/lib/catalog/project-configurations-data'
import { displayedTierPrice, tiersForRegion } from '../../src/lib/catalog/tiers'
import { monthlyPaymentForProject } from '../../src/lib/mortgage'

test('special prices replace displayed prices while mortgage principal stays regional and ordinary', () => {
  const data = normalizeConfigurations([], 'Каркасный').map(row => ({ ...row, price: 5000000, regionalPrices: { nn: 5000000, msk: 6000000 }, specialPrices: { nn: 4000000 } }))
  const tiers = configurationTiers(data, 'Каркасный')!
  const nn = tiersForRegion(tiers, 'nn')[1]!
  assert.equal(nn.price, 5000000)
  assert.equal(displayedTierPrice(nn), 4000000)
  assert.notEqual(monthlyPaymentForProject({ propertyPrice: nn.price, region: 'nn' }), monthlyPaymentForProject({ propertyPrice: displayedTierPrice(nn), region: 'nn' }))
  const msk = tiersForRegion(tiers, 'msk')[1]!
  assert.equal(msk.price, 6000000)
  assert.equal(displayedTierPrice(msk), 0, 'missing special price neither borrows NN nor displays the ordinary price')
  assert.equal(tiers[2]!.id, 'project')
  assert.equal(tiers[2]!.name, 'Расширенная')
  assert.equal(configurationTiers(normalizeConfigurations([], 'Модульный'), 'Модульный')![1]!.name, 'Проектная')
})

test('configuration API publishes customer special prices separately and excludes both dealer prices', async () => {
  const previous = process.env.CMS_SITE_API_KEY
  process.env.CMS_SITE_API_KEY = 'special-prices-test-key-000000000000'
  const prices = [['nn', 5000000], ['msk', 6000000], ['special', 4000000], ['special-msk', 4800000], ['dealer', 111111], ['special-dealer', 222222]].map(([region, price]) => ({ configuration: 'standard', region, price }))
  try {
    const response = await projectConfigurationsEndpoint.handler({
      url: 'https://cms.example/api/projects/configurations?slug=house',
      headers: new Headers({ authorization: `Bearer ${process.env.CMS_SITE_API_KEY}` }),
      payload: { find: async ({ collection }: { collection: string }) => ({ docs: collection === 'projects' ? [{ id: 1, technologyBadge: 'Каркасный', configurations: normalizeConfigurations([], 'Каркасный') }] : collection === 'project-prices' ? prices : [] }) },
    } as unknown as PayloadRequest)
    assert.equal(response.status, 200)
    const body = await response.json()
    const standard = body.configurations.find((row: { key: string }) => row.key === 'standard')
    assert.deepEqual(standard.regionalPrices, { nn: 5000000, msk: 6000000 })
    assert.deepEqual(standard.specialPrices, { nn: 4000000, msk: 4800000 })
    assert.doesNotMatch(JSON.stringify(body), /dealer|111111|222222/)
  } finally {
    if (previous === undefined) delete process.env.CMS_SITE_API_KEY
    else process.env.CMS_SITE_API_KEY = previous
  }
})
