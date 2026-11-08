import { getMortgageProgram } from '../src/lib/mortgage/programs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { passportPricing } from '../src/lib/passports/pricing'
import { resolvePassportData } from '../src/lib/passports/resolver'
import { PROJECT_TIERS } from '../src/lib/catalog/tiers'
import { configurationTiers } from '../src/lib/catalog/project-configurations-data'
import { calculateMortgage } from '../src/lib/mortgage/calc'

const tiers = () => PROJECT_TIERS.map((tier, index) => ({ ...tier, price: (index + 1) * 1_000_000,
  regionalPrices: { nn: (index + 1) * 1_000_000, msk: (index + 1) * 2_000_000 } }))

test('ordinary prices are displayed without specials; mortgage uses standard, not cheaper project', () => {
  const input = tiers()
  input[2]!.regionalPrices.nn = 500_000
  const result = passportPricing(input, 'panel', 'nn')
  assert.equal(result.standardMortgageBasePrice, 2_000_000)
  assert.deepEqual(result.tiers.map(tier => [tier.key, tier.regularPrice, tier.specialPrice, tier.displayedPrice, tier.special]),
    [['start', 1_000_000, null, 1_000_000, false], ['standard', 2_000_000, null, 2_000_000, false], ['project', 500_000, null, 500_000, false]])
  assert.equal(result.monthlyMortgagePayment, calculateMortgage({ programId: 'family', region: 'nn', propertyPrice: 2_000_000,
    downPayment: 400_000, termYears: 30, combinedMarketRateOverride: 0.16 }).monthlyPayment)
  assert.ok(result.tiers.every(tier => tier.priceLabel.includes('руб.')))
})

test('special display never becomes mortgage principal; regional snapshots stay independent', () => {
  const input = tiers().map(tier => ({ ...tier, regionalSpecialPrices: { nn: 123_000, msk: 456_000 } }))
  const nn = passportPricing(input, 'panel', 'nn')
  const msk = passportPricing(input, 'panel', 'msk')
  assert.deepEqual([nn.standardMortgageBasePrice, msk.standardMortgageBasePrice], [2_000_000, 4_000_000])
  assert.deepEqual([nn.tiers[1].displayedPrice, msk.tiers[1].displayedPrice], [123_000, 456_000])
  assert.ok(nn.tiers[1].regularPriceLabel)
  assert.equal(nn.tiers[1].special, true)
})

test('reject missing regional ordinary prices, incomplete or duplicate tiers and invalid specials', () => {
  assert.throws(() => passportPricing(tiers().slice(1), 'panel', 'nn'))
  assert.throws(() => passportPricing([tiers()[0]!, tiers()[0]!, tiers()[2]!], 'panel', 'nn'))
  assert.throws(() => passportPricing(tiers().map(tier => ({ ...tier, regionalPrices: { nn: tier.price } })), 'panel', 'msk'))
  assert.throws(() => passportPricing(tiers().map(tier => ({ ...tier, specialPrice: -1 })), 'panel', 'nn'))
  assert.throws(() => passportPricing(tiers(), 'panel', 'dealer' as 'nn'))
})

test('loan caps suppress payment instead of presenting capped amount as a valid quote', () => {
  const result = passportPricing(tiers().map(tier => ({ ...tier, regionalPrices: { nn: 100_000_000 } })), 'panel', 'nn')
  assert.equal(result.monthlyMortgagePayment, null)
  assert.equal(result.mortgagePaymentLabel, null)
})

test('modular keys and frame naming use existing technology definitions', () => {
  for (const [badge, technology, keys, names] of [
    ['Модульный', 'modular', ['standard', 'project', 'turnkey'], ['Стандартная', 'Проектная', 'Под ключ']],
    ['Каркасный', 'frame', ['start', 'standard', 'project'], ['Стартовая', 'Стандартная', 'Расширенная']],
  ] as const) {
    const input = configurationTiers(keys.map(key => ({ key, price: 1_000_000, regionalPrices: { nn: 1_000_000 } })), badge)!
    assert.deepEqual(passportPricing(input, technology, 'nn').tiers.map(tier => tier.name), names)
  }
})

const project = { slug: 'test-house', name: 'Тестовый дом', technology: 'panel', technologyBadge: 'Панельно-каркасный',
  areaValue: 73, floorsValue: 2, bedrooms: '2', bathrooms: '1', imageUrl: '/house.jpg' }
const plans = [{ label: 'Вариант А', floors: [
  { label: '1 этаж', image: '/plan-1.png', rooms: [{ name: 'Кухня', area: '12,5' }, { name: 'Холл', area: '5 м²' }] },
  { label: '2 этаж', image: '/plan-2.png', rooms: [{ name: 'Спальня', area: '18.2' }] },
] }]
function mockFetch(overrides: Record<string, unknown> = {}, calls: string[] = []): typeof fetch {
  return (async (url: string | URL | Request, init?: RequestInit) => {
    const path = new URL(String(url)).pathname
    calls.push(path)
    assert.equal(init?.cache, 'no-store')
    assert.equal((init?.headers as Record<string, string>).Authorization, 'Bearer local-test-key')
    const payloads: Record<string, unknown> = {
      '/api/projects/catalog': { items: [project] }, '/api/projects/plans': { variants: plans },
      '/api/projects/configurations': { technologyBadge: 'Панельно-каркасный', configurations: ['start', 'standard', 'project'].map(key => ({ key, price: 1_000_000, regionalPrices: { nn: 1_000_000, msk: 2_000_000 } })) },
      '/api/globals/lead-delivery/messengers': { telegram: { enabled: false }, max: { enabled: true, href: 'https://max.ru/local-test' }, whatsapp: { enabled: false } },
      ...overrides,
    }
    return Response.json(payloads[path])
  }) as typeof fetch
}
const options = { origin: 'http://localhost:3001', apiKey: 'local-test-key', now: new Date('2026-11-08T00:00:00Z') }

test('structured resolver snapshot preserves floor rooms, three tiers, region and source facts', async () => {
  const data = await resolvePassportData('test-house', 'msk', { ...options, fetch: mockFetch() })
  assert.deepEqual(data.plans, [{ id: 'plan-1', name: 'Вариант А', floors: [
    { id: 'plan-1-floor-1', name: '1 этаж', image: 'http://localhost:3001/plan-1.png', rooms: [{ number: 1, name: 'Кухня', areaLabel: '12,5 м²' }, { number: 2, name: 'Холл', areaLabel: '5 м²' }] },
    { id: 'plan-1-floor-2', name: '2 этаж', image: 'http://localhost:3001/plan-2.png', rooms: [{ number: 1, name: 'Спальня', areaLabel: '18.2 м²' }] },
  ] }])
  assert.equal(data.schemaVersion, 1)
  assert.equal(data.pricing.tiers.length, 3)
  assert.equal(data.pricing.standardMortgageBasePrice, 2_000_000)
  assert.equal(data.project.url, 'https://avgst.ru/catalog/test-house')
  assert.ok(data.comparison.rows.every(row => row.values.length === 3))
  assert.ok(data.comparison.rows.some(row => row.note?.includes('45×140')))
  assert.ok(data.comparison.rows.filter(row => row.note).every(row => row.note?.startsWith('Для включённых комплектаций:') || row.note?.startsWith('Справочно:')))
  assert.ok(data.comparison.rows.every(row => row.values.every(value => !value.includes('Для включённых комплектаций:'))))
  assert.ok(data.comparison.rows.every(row => !row.label.includes(';')))
  assert.ok(data.comparison.rows.every(row => row.values.every(value => !value.includes('Источник подтверждён'))))
  assert.ok(data.contacts.socials.some(item => item.href === 'https://vk.com/avgstroy_msk'))
  assert.ok(!data.contacts.socials.some(item => item.label === 'Telegram'))
  assert.equal(data.contacts.updatedAt, '08.11.2026')
  assert.equal(data.project.technologyLabel, 'Панельно-каркасный')
  assert.deepEqual(data.comparison.sourceGaps, [])
})

test('frame comparison uses the actual ten elements and documented regulation, without unrelated systems', async () => {
  const data = await resolvePassportData('test-house', 'nn', { ...options, fetch: mockFetch({
    '/api/projects/catalog': { items: [{ ...project, technology: 'frame', technologyBadge: 'Каркасный' }] },
    '/api/projects/configurations': { technologyBadge: 'Каркасный', configurations: ['start', 'standard', 'project'].map(key => ({ key, price: 1_000_000 })) },
  }) })
  assert.equal(data.project.technology, 'frame')
  assert.equal(data.project.technologyLabel, 'Каркасный')
  assert.deepEqual(data.comparison.sourceGaps, [])
  assert.equal(data.comparison.rows.filter(row => !row.id.startsWith('source-gap:')).length, 10)
  const gaps = data.comparison.rows.filter(row => row.id.startsWith('source-gap:'))
  assert.ok(gaps.every(row => row.values.every(value => value === 'Уточняется')))
  assert.equal(gaps.length, 0)
  assert.ok(data.comparison.rows.find(row => row.id.endsWith(':frame'))?.note?.includes('45 × 190'))
  assert.ok(data.comparison.rows.find(row => row.id.endsWith(':roofing'))?.note?.includes('0,45 мм'))
})

test('imported copy forwards contentBlock; override stays local', async () => {
  const fetcher = mockFetch()
  let requestedBlock: string | null = null
  const checkingFetch: typeof fetch = async (input, init) => {
    const url = new URL(String(input))
    if (url.pathname === '/api/projects/configurations') requestedBlock = url.searchParams.get('contentBlock')
    return fetcher(input, init)
  }
  await resolvePassportData('test-house', 'nn', { ...options, sharedContentBlockKey: 'import-local-ProjectConfig', fetch: checkingFetch })
  assert.equal(requestedBlock, 'import-local-ProjectConfig')
  await assert.rejects(resolvePassportData('test-house', 'nn', { ...options, origin: 'https://cms.avgst.ru', sharedContentBlockKey: 'import-local-ProjectConfig', fetch: mockFetch() }),
    { code: 'local-config' })
})

test('environment block selection is forwarded and explicit option takes precedence', async () => {
  const previous = process.env.PASSPORT_LOCAL_CONFIG_BLOCK
  process.env.PASSPORT_LOCAL_CONFIG_BLOCK = 'import-local-ProjectConfig'
  try {
    const seen: (string | null)[] = []
    const fetcher = mockFetch()
    const checkingFetch: typeof fetch = async (input, init) => {
      const url = new URL(String(input))
      if (url.pathname === '/api/projects/configurations') seen.push(url.searchParams.get('contentBlock'))
      return fetcher(input, init)
    }
    await resolvePassportData('test-house', 'nn', { ...options, fetch: checkingFetch })
    await resolvePassportData('test-house', 'nn', { ...options, sharedContentBlockKey: 'ProjectConfig', fetch: checkingFetch })
    assert.deepEqual(seen, ['import-local-ProjectConfig', 'ProjectConfig'])
  } finally {
    if (previous === undefined) delete process.env.PASSPORT_LOCAL_CONFIG_BLOCK
    else process.env.PASSPORT_LOCAL_CONFIG_BLOCK = previous
  }
})

test('unpublished and incomplete plans fail before creating a passport', async () => {
  const calls: string[] = []
  await assert.rejects(resolvePassportData('test-house', 'nn', { ...options, fetch: mockFetch({ '/api/projects/catalog': { items: [] } }, calls) }))
  assert.deepEqual(calls, ['/api/projects/catalog'])
  for (const variants of [[], [{ label: 'А', floors: [] }], [{ label: 'А', floors: [{ label: '1', image: '/p.png', rooms: [{ name: 'Холл', area: '0' }] }] }]]) {
    await assert.rejects(resolvePassportData('test-house', 'nn', { ...options, fetch: mockFetch({ '/api/projects/plans': { variants } }) }))
  }
})


test('combined mortgage reacts to the shared market rate and preserves the ordinary principal', () => {
  const input = tiers()
  input[1]!.regionalPrices.nn = 9_000_000
  const market = getMortgageProgram('market')
  const previous = market.rate
  try {
    const before = passportPricing(input, 'panel', 'nn')
    market.rate = .2
    const after = passportPricing(input, 'panel', 'nn')
    assert.ok(before.monthlyMortgagePayment && after.monthlyMortgagePayment && after.monthlyMortgagePayment > before.monthlyMortgagePayment)
    assert.equal(after.standardMortgageBasePrice, 9_000_000)
  } finally { market.rate = previous }
})
