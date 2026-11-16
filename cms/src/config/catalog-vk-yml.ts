import type { Media, Project, ProjectPrice } from '../payload-types'
import { catalogPrice } from './catalog-price'
import { summaryConfiguration, type PriceKind } from './price-kinds'

const origin = 'https://avgst.ru'
const xml = (value: unknown) => String(value).replace(/[^\u0009\u000A\u000D\u0020-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/gu, '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]!)
const plain = (value: string) => value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

function absoluteUrl(image: string | null | undefined, mediaOrigin: string) {
  if (!image) return null
  try {
    const url = new URL(image, mediaOrigin)
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null
    return url.href
  } catch {
    return null
  }
}

function rowImage(row: { photo?: number | Media | null; image?: string | null } | null | undefined, mediaOrigin: string) {
  if (!row) return null
  const fromPhoto = typeof row.photo === 'object' && row.photo && 'url' in row.photo ? row.photo.url : null
  return absoluteUrl(fromPhoto || row.image || null, mediaOrigin)
}

/** Главное + до 3 фасадов + до 3 интерьеров; планировка всегда последней. */
export function vkOfferPictures(project: Project, mediaOrigin: string) {
  const used = new Set<string>()
  const take = (href: string | null, into: string[], limit: number) => {
    if (!href || used.has(href) || into.length >= limit) return
    used.add(href)
    into.push(href)
  }
  const main = absoluteUrl(
    (typeof project.desktopImage === 'object' && project.desktopImage ? project.desktopImage.url : null) || project.imageUrl || null,
    mediaOrigin,
  )
  const mainList: string[] = []
  const exteriorList: string[] = []
  const interiorList: string[] = []
  take(main, mainList, 1)
  const exteriors = [...(project.exteriors || [])].sort((left, right) => Number(Boolean(right.isPrimary)) - Number(Boolean(left.isPrimary)))
  for (const row of exteriors) take(rowImage(row, mediaOrigin), exteriorList, 3)
  for (const row of project.interiors || []) take(rowImage(row, mediaOrigin), interiorList, 3)
  const ordered = [...mainList, ...exteriorList, ...interiorList]
  const plan = (() => {
    for (const variant of project.plans || []) {
      for (const floor of variant.floors || []) {
        const href = rowImage(floor, mediaOrigin)
        if (href) return href
      }
      const legacy = absoluteUrl(variant.image || null, mediaOrigin)
      if (legacy) return legacy
    }
    for (const row of project.floorPlans || []) {
      const href = absoluteUrl(row.image, mediaOrigin)
      if (href) return href
    }
    return null
  })()
  if (!plan) return ordered
  return [...ordered.filter(href => href !== plan), plan]
}

export function catalogVkYml(projects: Project[], prices: ProjectPrice[], now = new Date(), mediaOrigin = origin, priceKind: PriceKind = 'nn') {
  if (priceKind !== 'nn' && priceKind !== 'msk') throw new Error('Фид ВКонтакте только для НН и МСК')
  const priceMap = new Map(prices.filter(row => row.configuration === summaryConfiguration(priceKind) && row.region === priceKind).map(row => [typeof row.project === 'number' ? row.project : row.project.id, row.price]))
  const ids = new Set<string>()
  let skipped = 0
  const offers = projects.flatMap(project => {
    if (project._status !== 'published') return []
    // Цена как для ипотеки: стандартная комплектация выбранного региона.
    const price = priceKind === 'nn' ? catalogPrice(project, priceMap.get(project.id)) : project.recordType === 'ready-home' ? null : priceMap.get(project.id)
    const category = project.technologyBadge === 'Модульный' ? 1 : project.technologyBadge === 'Панельно-каркасный' ? 2 : project.technologyBadge === 'Каркасный' ? 3 : null
    const pictures = vkOfferPictures(project, mediaOrigin)
    if (!project.name?.trim() || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(project.slug) || !category || !price || !Number.isFinite(price) || price <= 0 || !pictures.length) {
      skipped++
      return []
    }
    const description = plain(project.searchDescription?.trim() || project.description?.trim() || [
      `${project.technologyBadge} дом «${project.name}».`,
      project.areaValue != null ? `Площадь: ${project.areaValue} м².` : '',
      project.floorsValue != null ? `Этажей: ${project.floorsValue}.` : '',
      project.bedrooms != null ? `Спален: ${project.bedrooms}.` : '',
      project.bathrooms != null ? `Санузлов: ${project.bathrooms}.` : '',
    ].filter(Boolean).join(' '))
    const id = String(project.id)
    if (ids.has(id)) throw new Error('Повторяющийся идентификатор проекта')
    ids.add(id)
    // ВКонтакте: не больше двух param на товар.
    const params = [
      project.areaValue != null ? `      <param name="Площадь" unit="м²">${xml(project.areaValue)}</param>` : '',
      project.technologyBadge ? `      <param name="Тип дома">${xml(project.technologyBadge)}</param>` : '',
    ].filter(Boolean).slice(0, 2).join('\n')
    const pictureXml = pictures.map(href => `      <picture>${xml(href)}</picture>`).join('\n')
    return [`    <offer id="${xml(id)}" available="true">\n      <url>${origin}/catalog/${xml(project.slug)}</url>\n      <price>${price}</price>\n      <currencyId>RUR</currencyId>\n      <categoryId>${category}</categoryId>\n${pictureXml}\n      <name>${xml(project.name)}</name>\n      <description>${xml(description)}</description>\n${params ? `${params}\n` : ''}    </offer>`]
  })
  const parts = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now)
  return { count: offers.length, skipped, xml: `<?xml version="1.0" encoding="UTF-8"?>\n<yml_catalog date="${parts}">\n  <shop>\n    <name>Авангард Строй</name>\n    <company>Авангард Строй</company>\n    <url>${origin}</url>\n    <currencies><currency id="RUR" rate="1"/></currencies>\n    <categories>\n      <category id="1">Модульные дома</category>\n      <category id="2">Панельно-каркасные дома</category>\n      <category id="3">Каркасные дома</category>\n    </categories>\n    <offers>\n${offers.join('\n')}\n    </offers>\n  </shop>\n</yml_catalog>\n` }
}
