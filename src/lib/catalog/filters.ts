import {
  CATALOG_SERIES,
  CATALOG_TECHNOLOGIES,
  isCatalogSeries,
  isCatalogTechnology,
  type CatalogFilters,
  type Range,
} from './types'

/**
 * Схема адреса каталога.
 *
 * Читается человеком, а не движком:
 *
 *   /catalog?area=80-140&bedrooms=3&bathrooms=2
 *
 * Правила, от которых не отступаем:
 *   1. Имя параметра это имя того, что фильтруем. Ни префиксов, ни следов
 *      реализации: в адресе не должно быть видно, чем сделан сайт.
 *   2. Диапазон это один параметр через дефис, открытый край допустим:
 *      area=80-140, area=80-, price=-4500000. Диапазон это одно понятие,
 *      и делить его на minArea и maxArea значит рассказывать про устройство
 *      формы вместо смысла.
 *   3. Несколько значений идут через запятую: bedrooms=2,3.
 *   4. Значение по умолчанию не пишется. Пустой фильтр это голый /catalog.
 *   5. Служебных параметров нет. Ни флага применения, ни счётчиков.
 *   6. Порядок параметров фиксирован (см. ORDER): один и тот же вид всегда
 *      даёт один и тот же адрес. Иначе поиск и аналитика считают их разными
 *      страницами.
 *   7. Неизвестный или негодный параметр не ошибка, а мусор: отбрасывается,
 *      страница отвечает редиректом на очищенный адрес. Без этого любой бот
 *      плодит бесконечные варианты ?utm_foo=1, и каждый идёт в индекс.
 */

/** Порядок параметров в адресе. Правило 6. */
const ORDER = ['q', 'series', 'tech', 'area', 'price', 'bedrooms', 'bathrooms', 'floors'] as const

export type RawParams = Record<string, string | string[] | undefined>

function first(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value
  const trimmed = raw?.trim()
  return trimmed ? trimmed : undefined
}

/** «80-140», «80-», «-140». Одиночное число задаёт точное совпадение. */
function parseRange(raw: string | undefined): Range | undefined {
  if (!raw) return undefined
  const match = /^(\d*)-(\d*)$/.exec(raw)
  if (!match) {
    const exact = /^\d+$/.test(raw) ? Number(raw) : NaN
    return Number.isFinite(exact) ? { min: exact, max: exact } : undefined
  }
  const [, lo, hi] = match
  if (!lo && !hi) return undefined
  const min = lo ? Number(lo) : undefined
  const max = hi ? Number(hi) : undefined
  if (min != null && max != null && min > max) return undefined
  return { min, max }
}

function formatRange(range: Range | undefined): string | undefined {
  if (!range) return undefined
  const { min, max } = range
  if (min == null && max == null) return undefined
  if (min != null && max != null && min === max) return String(min)
  return `${min ?? ''}-${max ?? ''}`
}

/** «2,3». Значения уникальны и отсортированы, правило 6 касается и их. */
function parseNumbers(raw: string | undefined, allow: (n: number) => boolean): number[] | undefined {
  if (!raw) return undefined
  const list = raw
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((n) => Number.isInteger(n) && allow(n))
  const unique = [...new Set(list)].sort((a, b) => a - b)
  return unique.length ? unique : undefined
}

/** Список строковых значений через запятую: tech=modular,panel. */
function parseList<T extends string>(
  raw: string | undefined,
  allow: (value: string) => value is T,
): T[] | undefined {
  if (!raw) return undefined
  const list = raw
    .split(',')
    .map((part) => part.trim())
    .filter(allow)
  const unique = [...new Set(list)].sort()
  return unique.length ? unique : undefined
}

const isCount = (n: number) => n > 0 && n <= 20

/** Имя проекта человек набирает как помнит: регистр и лишние пробелы не в счёт. */
export function normalizeQuery(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').slice(0, 64)
}

export function parseFilters(params: RawParams): CatalogFilters {
  const series = first(params.series)
  const tech = parseList(first(params.tech), isCatalogTechnology)
  const q = first(params.q)
  const query = q ? normalizeQuery(q) : ''
  return {
    q: query || undefined,
    series: series && isCatalogSeries(series) ? series : undefined,
    tech,
    area: parseRange(first(params.area)),
    price: parseRange(first(params.price)),
    bedrooms: parseNumbers(first(params.bedrooms), isCount),
    bathrooms: parseNumbers(first(params.bathrooms), isCount),
    floors: parseNumbers(first(params.floors), isCount),
  }
}

/** Адрес каталога для этого набора. Пустой набор даёт голый /catalog. */
/* Запятая в строке запроса легальна и разделяет значения списка.
   encodeURIComponent гонит её в %2C, и адрес перестаёт читаться
   глазами, поэтому возвращаем её на место. */
function encodeValue(value: string): string {
  return encodeURIComponent(value).replace(/%2C/g, ',')
}

export function filtersToHref(filters: CatalogFilters, pathname = '/catalog'): string {
  const value: Record<(typeof ORDER)[number], string | undefined> = {
    q: filters.q,
    series: filters.series,
    tech: filters.tech?.join(','),
    area: formatRange(filters.area),
    price: formatRange(filters.price),
    bedrooms: filters.bedrooms?.join(','),
    bathrooms: filters.bathrooms?.join(','),
    floors: filters.floors?.join(','),
  }
  const parts = ORDER.filter((key) => value[key]).map(
    (key) => `${key}=${encodeValue(value[key]!)}`,
  )
  return parts.length ? `${pathname}?${parts.join('&')}` : pathname
}

export function isEmpty(filters: CatalogFilters): boolean {
  return filtersToHref(filters) === '/catalog'
}

/**
 * Адрес, на который надо ответить редиректом, если пришедший содержит мусор
 * или нарушает порядок. null означает, что адрес уже канонический.
 */
export function canonicalRedirect(params: RawParams, filters: CatalogFilters): string | null {
  /* Порядок берётся из пришедшего адреса, а не из ORDER: ключи объекта
     идут в порядке строки запроса, и перестановка тоже должна считаться
     неканоническим адресом. */
  const known = new Set<string>(ORDER)
  const incoming = Object.keys(params)
    .map((key) => {
      if (!known.has(key)) return null
      const raw = first(params[key])
      return raw ? `${key}=${encodeValue(raw)}` : null
    })
    .filter(Boolean)
    .join('&')
  const hasUnknown = Object.keys(params).some((key) => !known.has(key))
  const canonical = filtersToHref(filters)
  const current = incoming ? `/catalog?${incoming}` : '/catalog'
  if (!hasUnknown && current === canonical) return null
  return canonical
}

export { CATALOG_SERIES, CATALOG_TECHNOLOGIES }
export type { CatalogFilters, Range }

/** Границы ползунков и наборы значений для сегментов. */
export type CatalogFacets = {
  area: { min: number; max: number }
  price: { min: number; max: number }
  bedrooms: number[]
  bathrooms: number[]
  floors: number[]
}

/**
 * Считается по самому каталогу, а не задаётся числами в вёрстке: добавился
 * проект шире прежнего, и ползунок площади сам разъехался под него.
 */
export function facetsOf(
  projects: readonly { areaValue: number; priceAmount: number | null; bedrooms: string; bathrooms: string; floorsValue: number }[],
): CatalogFacets {
  const areas = projects.map((p) => p.areaValue).filter((n) => n > 0)
  const prices = projects.map((p) => p.priceAmount ?? 0).filter((n) => n > 0)
  const uniq = (list: number[]) => [...new Set(list)].filter((n) => n > 0).sort((a, b) => a - b)
  return {
    area: { min: Math.min(...areas), max: Math.max(...areas) },
    price: { min: Math.min(...prices), max: Math.max(...prices) },
    bedrooms: uniq(projects.map((p) => Number(p.bedrooms))),
    bathrooms: uniq(projects.map((p) => Number(p.bathrooms))),
    floors: uniq(projects.map((p) => p.floorsValue)),
  }
}

/**
 * Сколько условий отбора задано. Нужно кнопке в полосе поиска: на узком
 * экране колонка свёрнута, и без числа непонятно, отфильтровано что-то или
 * выдача полная.
 */
export function countActive(filters: CatalogFilters): number {
  let n = 0
  if (filters.q) n += 1
  if (filters.series) n += 1
  if (filters.tech?.length) n += 1
  if (filters.area) n += 1
  if (filters.price) n += 1
  if (filters.bedrooms?.length) n += 1
  if (filters.bathrooms?.length) n += 1
  if (filters.floors?.length) n += 1
  return n
}
