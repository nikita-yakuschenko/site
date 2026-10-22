import type { Project, ProjectPrice } from '../payload-types'
import { catalogPrice } from './catalog-price'
import { summaryConfiguration, type PriceKind } from './price-kinds'
import { collectionHref } from '../../../src/lib/catalog/collection'

const origin = 'https://avgst.ru'
const xml = (value: unknown) => String(value).replace(/[^\u0009\u000A\u000D\u0020-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/gu, '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]!)

export function catalogYml(projects: Project[], prices: ProjectPrice[], now = new Date(), mediaOrigin = origin, priceKind: PriceKind = 'nn') {
  const priceMap = new Map(prices.filter(row => row.configuration === summaryConfiguration(priceKind) && row.region === priceKind).map(row => [typeof row.project === 'number' ? row.project : row.project.id, row.price]))
  const ids = new Set<string>()
  const collections = [
    { id: 'all-houses', name: 'Проекты домов', href: '/catalog', description: 'Проекты модульных и каркасных домов от Авангард Строй.' },
    { id: 'modular-houses', name: 'Модульные дома', href: collectionHref('modular'), description: 'Проекты модульных домов от Авангард Строй.' },
    { id: 'frame-houses', name: 'Каркасные дома', href: collectionHref('panel'), description: 'Проекты каркасных домов от Авангард Строй.' },
  ]
  const collectionPictures = new Map<string, string>()
  let skipped = 0
  const offers = projects.flatMap(project => {
    if (project._status !== 'published') return []
    // Only the NN feed has a legacy project price and ready-home sale price.
    const price = priceKind === 'nn' ? catalogPrice(project, priceMap.get(project.id)) : project.recordType === 'ready-home' ? null : priceMap.get(project.id)
    const category = project.technologyBadge === 'Модульный' ? 1 : project.technologyBadge === 'Панельно-каркасный' ? 2 : null
    const image = typeof project.desktopImage === 'object' && project.desktopImage ? project.desktopImage.url : project.imageUrl
    let picture: URL | undefined
    try { if (image) picture = new URL(image, mediaOrigin) } catch { /* Invalid image excludes the offer. */ }
    if (!project.name?.trim() || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(project.slug) || !category || !price || !Number.isFinite(price) || price <= 0 || !picture || !['https:', 'http:'].includes(picture.protocol) || picture.username || picture.password) {
      skipped++
      return []
    }
    const description = project.searchDescription?.trim() || project.description?.trim() || [
      `${category === 1 ? 'Модульный' : 'Каркасный'} дом «${project.name}».`,
      project.areaValue != null ? `Площадь: ${project.areaValue} м².` : '',
      project.floorsValue != null ? `Этажей: ${project.floorsValue}.` : '',
      project.bedrooms != null ? `Спален: ${project.bedrooms}.` : '',
      project.bathrooms != null ? `Санузлов: ${project.bathrooms}.` : '',
    ].filter(Boolean).join(' ')
    const id = String(project.id)
    if (ids.has(id)) throw new Error('Повторяющийся идентификатор проекта')
    ids.add(id)
    const collectionIds = ['all-houses', category === 1 ? 'modular-houses' : 'frame-houses']
    for (const collectionId of collectionIds) {
      if (!collectionPictures.has(collectionId)) collectionPictures.set(collectionId, picture.href)
    }
    const param = (name: string, value: unknown, unit = '') => value == null || value === '' ? '' : `      <param name="${name}"${unit ? ` unit="${unit}"` : ''}>${xml(value)}</param>\n`
    return [`    <offer id="${xml(id)}" available="true">\n      <url>${origin}/catalog/${xml(project.slug)}</url>\n      <price>${price}</price>\n      <currencyId>RUR</currencyId>\n      <categoryId>${category}</categoryId>\n      <picture>${xml(picture.href)}</picture>\n      <name>${xml(project.name)}</name>\n      <description>${xml(description)}</description>\n${param('Площадь', project.areaValue, 'м²')}${param('Количество спален', project.bedrooms)}${param('Количество санузлов', project.bathrooms)}${param('Количество этажей', project.floorsValue)}${param('Тип дома', category === 1 ? 'Модульный' : 'Каркасный')}${collectionIds.map(collectionId => `      <collectionId>${collectionId}</collectionId>\n`).join('')}    </offer>`]
  })
  const collectionXml = collections.filter(collection => collectionPictures.has(collection.id)).map(collection =>
    `      <collection id="${collection.id}">\n        <url>${xml(new URL(collection.href, origin).href)}</url>\n        <picture>${xml(collectionPictures.get(collection.id))}</picture>\n        <name>${xml(collection.name)}</name>\n        <description>${xml(collection.description)}</description>\n      </collection>`
  ).join('\n')
  // Explicit Moscow time makes generation independent of the server timezone.
  const parts = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now)
  return { count: offers.length, skipped, xml: `<?xml version="1.0" encoding="UTF-8"?>\n<yml_catalog date="${parts}">\n  <shop>\n    <name>Авангард Строй</name>\n    <company>Авангард Строй</company>\n    <url>${origin}</url>\n    <currencies><currency id="RUR" rate="1"/></currencies>\n    <categories>\n      <category id="1">Модульные дома</category>\n      <category id="2">Каркасные дома</category>\n    </categories>\n    <offers>\n${offers.join('\n')}\n    </offers>\n    <collections>\n${collectionXml}\n    </collections>\n  </shop>\n</yml_catalog>\n` }
}
