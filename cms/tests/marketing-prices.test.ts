import test from 'node:test'
import assert from 'node:assert/strict'
import { configurationKeys, priceConfigurationKeys } from '../../src/lib/catalog/configuration-rules'
import { summaryConfiguration } from '../src/config/price-kinds'
import { marketingFileKind, matchMarketingCatalog, parseMarketingGrid, priceNameKey } from '../src/config/marketing-prices'
import { mergePriceRows, type PriceInput } from '../src/config/price-import'

const kits = [null, null, null, null, null, 'Старт', 'Базовая', 'Проектная', 'Под ключ']

test('a modular house keeps the layout with the higher package total', () => {
  const parsed = parseMarketingGrid([
    ['Название проекта', null, null, null, null, 'Барн 46 (1К)', 'Барн 46 (1К)', 'Барн 46 (1К)', 'Барн 46 (1К)'],
    kits,
    ['Стоимость дома', null, null, null, null, 1457000, 2227000, 2815000, 3864000],
    ['Специальное предложение', null, null, null, null, 1283000, 1960000, 2478000, 3401000],
    ['Допы'],
    ['Терраса', null, null, null, null, 388000, null, 'Включено', 'Включено'],
    ['Название проекта', null, null, null, null, 'Барн 46 (2К)', 'Барн 46 (2К)', 'Барн 46 (2К)', 'Барн 46 (2К)'],
    kits,
    ['Стоимость дома', null, null, null, null, 1469000, 2209000, 2808000, 3897000],
    ['Специальное предложение', null, null, null, null, 1293000, 1944000, 2472000, 3430000],
  ], '41. НН. МД. Маркетинг.Октябрь 2026.xlsx')
  assert.deepEqual(parsed.choices, [{ projectName: 'Барнхаус 46', sourceName: 'Барн 46 (2К)', skipped: ['Барн 46 (1К)'] }])
  assert.equal(parsed.rows.find(row => row.configuration === 'standard' && row.region === 'nn')?.price, 2209000)
  assert.equal(parsed.rows.find(row => row.configuration === 'start' && row.region === 'special')?.price, 1293000)
  assert.equal(parsed.rows.some(row => row.price === 388000), false)
})

test('moscow panel file maps the base kit to the standard price', () => {
  const parsed = parseMarketingGrid([
    ['Название проекта', null, null, null, null, 'Барнхаус 115 (1 с/у)', 'Барнхаус 115 (1 с/у)', 'Барнхаус 115 (1 с/у)'],
    [null, null, null, null, null, 'Старт', 'Базовая', 'Проектная'],
    ['Стоимость дома', null, null, null, null, 1000000, 2000000, 3000000],
    ['Специальное предложение', null, null, null, null, 900000, 1800000, 2700000],
    ['Название проекта', null, null, null, null, 'Барнхаус 115 (2 с/у)', 'Барнхаус 115 (2 с/у)', 'Барнхаус 115 (2 с/у)'],
    [null, null, null, null, null, 'Старт', 'Базовая', 'Проектная'],
    ['Стоимость дома', null, null, null, null, 1100000, 2100000, 3100000],
    ['Специальное предложение', null, null, null, null, 990000, 1900000, 2800000],
  ], '32. МСК. Маркетинг. Октябрь. ПКД с производства.xlsx')
  assert.equal(parsed.choices[0].sourceName, 'Барнхаус 115 (2 с/у)')
  assert.deepEqual(parsed.rows.map(row => [row.configuration, row.region, row.price]), [
    ['start', 'msk', 1100000],
    ['standard', 'msk', 2100000],
    ['project', 'msk', 3100000],
    ['start', 'special-msk', 990000],
    ['standard', 'special-msk', 1900000],
    ['project', 'special-msk', 2800000],
  ])
})

test('a dealer file keeps the start price and the dealer special', () => {
  const parsed = parseMarketingGrid([
    ['Название проекта', null, null, null, null, 'А-фрейм 52', null, 'Навигация по домам'],
    [null, null, null, null, null, 'Старт', null, 'Дом'],
    ['Стоимость дома', null, null, null, null, 745000],
    ['Специальное предложение', null, null, null, null, 656000],
    ['Сборка Нижний Новгород', null, null, null, null, 80000],
  ], '16. Дилер. ПКД. Маркетинг. Октябрь 2026.xlsx')
  assert.deepEqual(parsed.rows, [
    { projectName: 'А-фрейм 52', configuration: 'start', region: 'dealer', price: 745000 },
    { projectName: 'А-фрейм 52', configuration: 'start', region: 'special-dealer', price: 656000 },
  ])
  assert.equal(marketingFileKind('16. Дилер. МД. Маркетинг. Октябрь 2026.xlsx').modular, true)
  assert.equal(priceNameKey('Барн 90 (23,8)'), 'барнхаус 90')
})

test('later price file replaces the same project price', () => {
  const first: PriceInput[] = [{ projectSlug: 'barn-46', configuration: 'standard', region: 'nn', price: 100 }]
  const second: PriceInput[] = [{ projectSlug: 'barn-46', configuration: 'standard', region: 'nn', price: 200 }, { projectSlug: 'barn-46', configuration: 'standard', region: 'msk', price: 300 }]
  assert.deepEqual(mergePriceRows([first, second]), [second[0], second[1]])
})

test('a draft without a slug still receives its prices', () => {
  const parsed = parseMarketingGrid([
    ['Название проекта', null, null, null, null, 'Экохаус 132', 'Экохаус 132', 'Экохаус 132'],
    [null, null, null, null, null, 'Старт', 'Базовая', 'Проектная'],
    ['Стоимость дома', null, null, null, null, 1000000, 2000000, 3000000],
    ['Название проекта', null, null, null, null, 'Барнхаус 115', 'Барнхаус 115', 'Барнхаус 115'],
    [null, null, null, null, null, 'Старт', 'Базовая', 'Проектная'],
    ['Стоимость дома', null, null, null, null, 1100000, 2100000, 3100000],
    ['Название проекта', null, null, null, null, 'Норвегия 90', 'Норвегия 90', 'Норвегия 90'],
    [null, null, null, null, null, 'Старт', 'Базовая', 'Проектная'],
    ['Стоимость дома', null, null, null, null, 1200000, 2200000, 3200000],
  ], '41. НН. ПКД. Маркетинг. Октябрь 2026.xlsx')
  const matched = matchMarketingCatalog(parsed, [
    { id: '10', name: 'Экохаус 132', slug: '', modular: false },
    { id: '11', name: 'Барнхаус 115', slug: 'barnhouse-115', modular: false },
    { id: '12', name: 'Барнхаус 115', slug: 'barnhouse-115-copy', modular: true },
  ], false)
  assert.deepEqual([...new Set(matched.rows.map(row => row.projectId))], ['10', '11'])
  assert.equal(matched.rows.find(row => row.projectId === '10')?.projectSlug, '')
  assert.equal(matched.issues.length, 0)
  assert.deepEqual(matched.unmatched, ['Норвегия 90'])
})

test('the price summary reads dealer prices from the only dealer kit', () => {
  assert.equal(summaryConfiguration('dealer'), 'start')
  assert.equal(summaryConfiguration('special-dealer'), 'start')
  assert.equal(summaryConfiguration('nn'), 'standard')
  assert.equal(summaryConfiguration('msk'), 'standard')
})

test('modular start stays in the price list and off the public kits', () => {
  assert.deepEqual(configurationKeys(true), ['standard', 'project', 'turnkey'])
  assert.deepEqual(priceConfigurationKeys(true), ['start', 'standard', 'project', 'turnkey'])
  assert.equal(priceConfigurationKeys(false).includes('turnkey'), false)
})
