import assert from 'node:assert/strict'
import { test } from 'node:test'
import { FRAME_TIERS } from '../../src/lib/catalog/frame-tiers'
import { configurationTiers } from '../../src/lib/catalog/project-configurations-data'
import { defaultConfigurationTemplates, sharedConfigurationContent } from '../../src/lib/catalog/configuration-content'
import { tiersForProject, tiersForRegion } from '../../src/lib/catalog/tiers'
import type { CatalogProject } from '../../src/lib/catalog/types'

test('frame tiers preserve the approved copy and have no inherited gifts or panel construction', () => {
  const tiers = configurationTiers(['start', 'standard', 'project'].map((key, i) => ({ key: key as 'start' | 'standard' | 'project', price: i * 1000000 })), 'Каркасный')!
  assert.deepEqual(tiers.map(t => t.name), ['Стартовая', 'Стандартная', 'Проектная'])
  assert.deepEqual(tiers.map(t => t.lead), ['Силовой каркас, кровля и наружная отделка — основа для дальнейшего обустройства дома.', 'Утеплённый дом с окнами и входной дверью. Подготовлен к внутренней отделке.', 'Внутренние стены и основание пола подготовлены к дальнейшей отделке.'])
  assert.deepEqual(tiers.map(t => t.includesTitle), ['Всё необходимое для начала:', 'Дополнительно к стартовой комплектации:', 'Дополнительно к стандартной комплектации:'])
  assert.deepEqual(tiers.map(t => t.includes), [
    ['Силовой (несущий) каркас', 'Кровельное покрытие', 'Фасадная отделка', 'Защита конструкций'],
    ['Утепление стен, пола и перекрытий', 'Окна ПВХ', 'Металлическая входная дверь', 'Черновое основание пола'],
    ['Обшивка стен гипсокартоном', 'Обшивка стен санузлов влагостойкими листами', 'Основание пола из ОСП'],
  ])
  assert.ok(tiers.every(t => t.gifts?.length === 0))
  assert.deepEqual(tiers.map(t => t.price), [0, 1000000, 2000000])
  assert.doesNotMatch(JSON.stringify(tiers[0]), /утеплен|окна|двер|террас|доставк|сборк/i)
  assert.doesNotMatch(JSON.stringify(tiers[2].includes), /чистов|окна|двер|террас/i)
  assert.ok(JSON.stringify(FRAME_TIERS[1].details).includes('150 мм'))
  assert.ok(JSON.stringify(FRAME_TIERS[2].details).includes('ОСП 12 мм'))
})

test('all three technology groups are isolated; missing frame data never falls back to panel templates', () => {
  const data = defaultConfigurationTemplates()
  const panel = structuredClone(data.panel), modular = structuredClone(data.modular)
  data.frame.start.lead = 'Редактируемая каркасная'
  data.frame.start.includes.push({ text: 'Только каркасная' })
  assert.deepEqual(data.panel, panel); assert.deepEqual(data.modular, modular)
  assert.equal(sharedConfigurationContent(data, 'Каркасный')[0].lead, 'Редактируемая каркасная')
  assert.equal(sharedConfigurationContent({ panel: data.panel, modular: data.modular }, 'Каркасный')[0].lead, FRAME_TIERS[0].lead)
  assert.deepEqual(sharedConfigurationContent(data, 'Модульный').map(t => t.key), ['standard', 'project', 'turnkey'])
  assert.deepEqual(sharedConfigurationContent(data, 'Панельно-каркасный').map(t => t.key), ['start', 'standard', 'project'])
})

test('frame fallback never calculates unprovided prices from another technology factors', () => {
  const project = { technology: 'frame', priceAmount: 5000000, regionalPrices: { nn: 5000000 } } as CatalogProject
  const tiers = tiersForProject(project)!
  assert.deepEqual(tiers.map(t => t.price), [0, 5000000, 0])
  assert.deepEqual(tiersForRegion(tiers, 'msk').map(t => t.price), [0, 0, 0])
  assert.deepEqual(tiersForProject({ ...project, priceAmount: null, regionalPrices: undefined })!.map(t => t.price), [0, 0, 0])
})
