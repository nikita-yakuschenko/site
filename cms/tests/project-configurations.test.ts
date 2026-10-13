import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeConfigurations } from '../src/config/project-configurations'
import { configurationTiers } from '../../src/lib/catalog/project-configurations-data'
import { tiersForRegion } from '../../src/lib/catalog/tiers'
import { parsePriceFile, parsePriceRows } from '../src/config/price-import'
import { defaultConfigurationTemplates, sharedConfigurationContent } from '../../src/lib/catalog/configuration-content'

test('technology determines the three configurations and starter never qualifies for mortgage', () => {
  const panel = normalizeConfigurations([{ key: 'start', price: 100, mortgage: true }], 'Панельно-каркасный')
  assert.deepEqual(panel.map(row => row.key), ['start', 'standard', 'project'])
  assert.equal(panel[0].mortgage, false)
  const modular = normalizeConfigurations(panel, 'Модульный')
  assert.deepEqual(modular.map(row => row.key), ['standard', 'project', 'turnkey'])
  assert.equal(modular[2].price, 0)
  assert.equal(modular.every(row => row.mortgage), true)
})

test('regional prices do not leak to a region without a price', () => {
  const rows = normalizeConfigurations([], 'Панельно-каркасный').map(row => ({ ...row, regionalPrices: { nn: 5000000 } }))
  const tiers = configurationTiers(rows, 'Панельно-каркасный')!
  assert.equal(tiersForRegion(tiers, 'nn')[1].price, 5000000)
  assert.equal(tiersForRegion(tiers, 'msk')[1].price, 0)
  assert.equal(tiers[0].mortgage, false)
})

test('descriptions, contents and details are shared while project prices remain independent', () => {
  const rows = normalizeConfigurations([], 'Панельно-каркасный')
  const first = configurationTiers(rows.map(row => ({ ...row, price: 5000000, lead: 'Project-specific description', includes: [{ text: 'Project-specific content' }], details: [] })), 'Панельно-каркасный')!
  const second = configurationTiers(rows.map(row => ({ ...row, price: 7000000 })), 'Панельно-каркасный')!
  assert.deepEqual(first.map(({ lead, includes, gifts, details }) => ({ lead, includes, gifts, details })), second.map(({ lead, includes, gifts, details }) => ({ lead, includes, gifts, details })))
  assert.equal(first[1].price, 5000000)
  assert.equal(second[1].price, 7000000)
  assert.notEqual(first[1].lead, 'Project-specific description')
  assert.ok(first[1].details.length > 0)
})

test('price imports accept JSON and CSV and reject duplicates and invalid amounts', () => {
  const row = { projectSlug: 'barnhouse-113', configuration: 'standard', region: 'msk', price: 6000000 }
  assert.deepEqual(parsePriceFile(JSON.stringify([row])), [row])
  assert.deepEqual(parsePriceFile('\uFEFFprojectSlug;configuration;region;price\r\nbarnhouse-113;standard;msk;6000000'), [row])
  assert.throws(() => parsePriceRows([row, row]))
  for (const price of [-1, 0, 1.5, Infinity]) assert.throws(() => parsePriceRows([{ ...row, price }]))
  assert.throws(() => parsePriceRows([{ ...row, region: 'unknown' }]))
})

test('shared block variants change content for their technology without overriding prices or mortgage rules', () => {
  const templates = defaultConfigurationTemplates()
  templates.panel!.standard!.lead = 'Общее описание панельно-каркасных'
  templates.panel!.standard!.includes = []
  const panelContent = sharedConfigurationContent(templates, 'Панельно-каркасный')
  const modularContent = sharedConfigurationContent(templates, 'Модульный')
  const tiers = configurationTiers(normalizeConfigurations([], 'Панельно-каркасный').map(row => ({ ...row, price: 1000000 })), 'Панельно-каркасный', panelContent)!
  assert.equal(tiers[1].lead, 'Общее описание панельно-каркасных')
  assert.deepEqual(tiers[1].includes, [])
  assert.notEqual(modularContent.find(row => row.key === 'standard')!.lead, tiers[1].lead)
  assert.equal(tiers[1].price, 1000000)
  assert.equal(tiers[0].mortgage, false)
  assert.deepEqual(modularContent.map(row => row.key), ['standard', 'project', 'turnkey'])
})
