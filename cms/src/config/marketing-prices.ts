import { priceConfigurationKeys, type ConfigurationKey } from '../../../src/lib/catalog/configuration-rules'
import type { PriceKind } from './price-kinds'

const kitLabels: Record<string, ConfigurationKey> = { 'старт': 'start', 'базовая': 'standard', 'проектная': 'project', 'под ключ': 'turnkey' }

export type MarketingChoice = { projectName: string; sourceName: string; skipped: string[] }
export type MarketingPriceRow = { projectName: string; configuration: ConfigurationKey; region: PriceKind; price: number }

// Имя файла говорит, чьи это цены и какая технология. «Базовая» в файле — стандартная комплектация.
export function marketingFileKind(filename: string): { modular: boolean; house: PriceKind; special: PriceKind } {
  const name = filename.toLowerCase().replace(/ё/g, 'е')
  const modular = /(^|[^a-zа-я])мд([^a-zа-я]|$)|модул/.test(name)
  const panel = /(^|[^a-zа-я])пкд([^a-zа-я]|$)|панел/.test(name)
  if (modular === panel) throw new Error('В имени файла должно быть понятно: модульные дома или ПКД')
  if (/дилер/.test(name)) return { modular, house: 'dealer', special: 'special-dealer' }
  const moscow = /(^|[^a-zа-я])мск([^a-zа-я]|$)|моск/.test(name)
  const nn = /(^|[^a-zа-я])нн([^a-zа-я]|$)|нижн/.test(name)
  if (moscow === nn) throw new Error('В имени файла должно быть понятно: НН или МСК')
  return { modular, house: moscow ? 'msk' : 'nn', special: moscow ? 'special-msk' : 'special' }
}

// Скобки в конце — планировка одного и того же дома. «Барн» в файле — это «Барнхаус».
export function priceNameKey(name: string) {
  const base = name.replace(/\s*\([^)]*\)\s*$/u, '').trim().toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ')
  return base.replace(/^барн(?!хаус)(?=\s|$)/, 'барнхаус')
}

export function priceProjectName(name: string) {
  return priceNameKey(name).replace(/(^|\s)([а-яa-z])/g, (_, space: string, letter: string) => space + letter.toUpperCase())
}

const text = (value: unknown) => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : typeof value === 'number' && Number.isFinite(value) ? String(value) : ''
const money = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.round(value) : null

type Quote = { sourceName: string; house: Partial<Record<ConfigurationKey, number>>; special: Partial<Record<ConfigurationKey, number>> }

function score(quote: Quote) {
  const house = Object.values(quote.house).reduce((sum, price) => sum + price, 0)
  const special = Object.values(quote.special).reduce((sum, price) => sum + price, 0)
  return house * 1_000_000_000 + special
}

const kitOf = (value: unknown) => kitLabels[text(value).toLowerCase().replace(/ё/g, 'е')]

export function parseMarketingGrid(grid: unknown[][], filename: string) {
  const kind = marketingFileKind(filename)
  const allowed = new Set(priceConfigurationKeys(kind.modular))
  const quotes: Quote[] = []
  for (let index = 1; index < grid.length; index++) {
    const columns = new Map<number, ConfigurationKey>()
    ;(grid[index] || []).forEach((cell, column) => {
      const kit = kitOf(cell)
      if (!kit) return
      columns.set(column, kit)
    })
    if (!columns.size) continue
    const sourceName = [...columns.keys()].map(column => text(grid[index - 1]?.[column])).find(value => value && !kitOf(value))
    if (!sourceName) throw new Error(`Строка ${index + 1}: нет названия проекта`)
    for (const [column, kit] of columns) {
      if (!allowed.has(kit)) throw new Error(`${sourceName}: комплектация «${text(grid[index]?.[column])}» не используется для этой технологии`)
      if ([...columns.values()].filter(item => item === kit).length > 1) throw new Error(`${sourceName}: комплектация «${text(grid[index]?.[column])}» повторяется`)
    }
    if (kind.house === 'dealer' && [...columns.values()].some(kit => kit !== 'start')) throw new Error(`${sourceName}: у дилера ожидается только комплектация «Старт»`)
    const quote: Quote = { sourceName, house: {}, special: {} }
    for (let row = index + 1; row < grid.length && !(grid[row] || []).some(cell => kitOf(cell)); row++) {
      const target = text(grid[row]?.[0]) === 'Стоимость дома' ? quote.house : text(grid[row]?.[0]) === 'Специальное предложение' ? quote.special : null
      if (!target) continue
      for (const [column, kit] of columns) {
        const price = money(grid[row]?.[column])
        if (price) target[kit] = price
      }
    }
    if (!Object.keys(quote.house).length) throw new Error(`${sourceName}: нет стоимости дома`)
    quotes.push(quote)
  }
  if (!quotes.length) throw new Error('В файле нет блоков «Название проекта»')
  const groups = new Map<string, Quote[]>()
  for (const quote of quotes) {
    const key = priceNameKey(quote.sourceName)
    groups.set(key, [...(groups.get(key) || []), quote])
  }
  const choices: MarketingChoice[] = []
  const rows: MarketingPriceRow[] = []
  for (const [key, variants] of groups) {
    const winner = [...variants].sort((left, right) => score(right) - score(left) || variants.indexOf(right) - variants.indexOf(left))[0]
    const projectName = priceProjectName(key)
    choices.push({ projectName, sourceName: winner.sourceName, skipped: variants.filter(item => item !== winner).map(item => item.sourceName) })
    for (const [configuration, price] of Object.entries(winner.house) as [ConfigurationKey, number][]) rows.push({ projectName, configuration, region: kind.house, price })
    for (const [configuration, price] of Object.entries(winner.special) as [ConfigurationKey, number][]) rows.push({ projectName, configuration, region: kind.special, price })
  }
  choices.sort((left, right) => left.projectName.localeCompare(right.projectName, 'ru'))
  return { choices, rows }
}

export type MarketingIssue = { projectName: string; kind: 'technology' | 'duplicate'; detail: string }
export type CatalogPriceProject = { id: string; name: string; slug: string | null; modular: boolean }

// Чужая технология или два проекта с одним названием не отменяют цены остальных домов из файла.
// Slug черновику не нужен: цена хранится на номере карточки.
export function matchMarketingCatalog(parsed: { choices: MarketingChoice[]; rows: MarketingPriceRow[] }, projects: CatalogPriceProject[], modular: boolean) {
  const issues: MarketingIssue[] = []
  const blocked = new Set<string>()
  const byKey = new Map<string, { id: string; slug: string; name: string }>()
  const grouped = new Map<string, CatalogPriceProject[]>()
  for (const project of projects) {
    const key = priceNameKey(project.name)
    if (!parsed.choices.some(item => priceNameKey(item.projectName) === key)) continue
    grouped.set(key, [...(grouped.get(key) || []), project])
  }
  for (const choice of parsed.choices) {
    const key = priceNameKey(choice.projectName)
    const found = grouped.get(key) || []
    const same = found.filter(project => project.modular === modular)
    if (!found.length) continue
    if (!same.length) {
      issues.push({ projectName: choice.projectName, kind: 'technology', detail: `«${choice.projectName}» совпало с проектом «${found[0].name}» другой технологии` })
      blocked.add(key)
      continue
    }
    if (same.length > 1) {
      issues.push({ projectName: choice.projectName, kind: 'duplicate', detail: `Два проекта называются «${same[0].name}», цены не записаны` })
      blocked.add(key)
      continue
    }
    byKey.set(key, { id: same[0].id, slug: same[0].slug?.trim() || '', name: same[0].name })
  }
  const unmatched = parsed.choices.filter(choice => {
    const key = priceNameKey(choice.projectName)
    return !byKey.has(key) && !blocked.has(key)
  }).map(choice => choice.projectName)
  const rows = parsed.rows.flatMap(row => {
    const project = byKey.get(priceNameKey(row.projectName))
    return project ? [{ projectId: project.id, projectSlug: project.slug, label: project.name, configuration: row.configuration, region: row.region, price: row.price }] : []
  })
  return { rows, unmatched, issues }
}
