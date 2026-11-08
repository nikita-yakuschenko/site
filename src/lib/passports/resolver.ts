import { configurationTiers, type ConfigurationData } from '../catalog/project-configurations-data'
import type { SharedConfigurationContent } from '../catalog/configuration-content'
import { isPlanVariants } from '../catalog/project-plans-data'
import { CATALOG_TECHNOLOGIES, technologyLabel, technologyFromBadge, type CatalogProject } from '../catalog/types'
import { technicalMatrices, deliveryInfoForRegion } from '../../components/configuration-comparison/model/data'
import type { SpecificationValue } from '../../components/configuration-comparison/model/types'
import { SITE, FOOTER_SOCIALS, footerSocialHref } from '../site'
import { copy } from '../copy'
import { formatDate, formatNumber } from '../locale'
import { passportPricing } from './pricing'
import { PassportDataError, type PassportData } from './types'
import type { RegionCode } from '../regions'

export type PassportResolverOptions = {
  origin?: string
  apiKey?: string
  fetch?: typeof globalThis.fetch
  now?: Date
  /** Local imported shared configuration block, forwarded as contentBlock. */
  sharedContentBlockKey?: string
}
const fail = (code: string, message: string): never => { throw new PassportDataError(code, message) }
const text = (value: unknown, field: string): string => typeof value === 'string' && value.trim() ? value.trim() : fail('missing-data', `Missing ${field}`)
function webURL(value: unknown, field: string, origin?: string): string {
  const raw = text(value, field)
  let url: URL
  try { url = new URL(raw, origin) } catch { return fail('url', `Invalid ${field}`) }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return fail('url', `Invalid ${field}`)
  return url.href
}
function client(options: PassportResolverOptions) {
  // Default deliberately stays local even under NODE_ENV=production.
  const origin = webURL(options.origin ?? process.env.CMS_PUBLIC_URL ?? 'http://localhost:3001', 'CMS origin')
  const key = text(options.apiKey ?? process.env.CMS_SITE_API_KEY, 'CMS_SITE_API_KEY')
  const fetcher = options.fetch ?? globalThis.fetch
  return { origin, async read(path: string): Promise<unknown> {
    const response = await fetcher(new URL(path, origin), { headers: { Authorization: `Bearer ${key}` }, cache: 'no-store', signal: AbortSignal.timeout(15000) })
    if (!response.ok) return fail('cms', `CMS ${path.split('?')[0]} returned ${response.status}`)
    return response.json()
  } }
}
function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : fail('cms-shape', 'Invalid CMS object')
}
async function catalog(cms: ReturnType<typeof client>, slug?: string): Promise<CatalogProject[]> {
  const data = object(await cms.read(`/api/projects/catalog${slug ? `?slug=${encodeURIComponent(slug)}` : ''}`))
  if (!Array.isArray(data.items)) return fail('cms-shape', 'Missing published catalog items')
  return data.items as CatalogProject[]
}
export async function listPublishedPassportProjects(options: PassportResolverOptions = {}): Promise<CatalogProject[]> {
  return (await catalog(client(options))).filter(project => !project.readyHome)
}
function compactFacts(parts: readonly (string | null | undefined)[]): string[] {
  const unique = [...new Set(parts.map(part => part?.trim()).filter((part): part is string => Boolean(part)))]
  // Keep the more informative statement when it already contains a shorter material name.
  return unique.filter(part => !unique.some(other => other !== part && other.includes(part)))
}
function comparisonValue(value: SpecificationValue | undefined): string {
  if (!value) return fail('comparison', 'Missing comparison value')
  const status = { included: 'Входит', excluded: 'Не входит', notApplicable: 'Не применяется', requiresVerification: 'Уточняется' }[value.status]
  if (!status) return fail('comparison', 'Unknown comparison status')
  const details = compactFacts([value.displayValue, value.material, ...value.technicalDetails])
  return [value.status === 'included' && details.length ? '' : status, ...details,
    value.sourceStatus === 'needsVerification' ? 'Требует проверки' : ''].filter(Boolean).join('; ')
}

/** Standalone structured CMS reader. Main build manager fingerprints and rechecks before publishing. */
export async function resolvePassportData(slug: string, region: RegionCode, options: PassportResolverOptions = {}): Promise<PassportData> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return fail('slug', 'Invalid project slug')
  if (region !== 'nn' && region !== 'msk') return fail('region', 'Unknown passport region')
  const cms = client(options)
  const sharedContentBlockKey = options.sharedContentBlockKey ?? process.env.PASSPORT_LOCAL_CONFIG_BLOCK
  if (sharedContentBlockKey !== undefined && !/^[A-Za-z0-9]+(?:[.-][A-Za-z0-9]+)*$/.test(sharedContentBlockKey)) return fail('local-config', 'Invalid shared configuration block key')
  if (sharedContentBlockKey && sharedContentBlockKey !== 'ProjectConfig') {
    const hostname = new URL(cms.origin).hostname
    if (!['localhost', '127.0.0.1', '[::1]'].includes(hostname)) return fail('local-config', 'Imported configuration block overrides require a loopback CMS origin')
  }
  // Catalog explicitly filters published records. Do not resolve private sections first.
  const matches = (await catalog(cms, slug)).filter(item => item.slug === slug)
  const project = matches[0]
  if (matches.length !== 1 || !project || project.readyHome) return fail('not-published', 'Published house project not found')
  if (!CATALOG_TECHNOLOGIES.includes(project.technology)) return fail('technology', 'Unknown technology')
  const [planPayload, configPayload] = await Promise.all([
    cms.read(`/api/projects/plans?slug=${encodeURIComponent(slug)}`),
    cms.read(`/api/projects/configurations?slug=${encodeURIComponent(slug)}${sharedContentBlockKey ? `&contentBlock=${encodeURIComponent(sharedContentBlockKey)}` : ''}`),
  ])
  const variants = object(planPayload).variants
  if (!isPlanVariants(variants) || !variants.length) return fail('plans', 'At least one complete plan with rooms is required')
  const config = object(configPayload)
  if (config.technologyBadge !== project.technologyBadge || !Array.isArray(config.configurations)) return fail('configurations', 'Inconsistent configuration technology or data')
  const tiers = configurationTiers(config.configurations as ConfigurationData[], project.technologyBadge, config.sharedContent as SharedConfigurationContent[] | undefined)
  if (!tiers) return fail('configurations', 'Invalid configuration set')
  const pricing = passportPricing(tiers, project.technology, region)
  const matrix = technicalMatrices[project.technology]
  const rows: PassportData['comparison']['rows'] = matrix.sections.flatMap(section => section.elements.map(element => {
    const info = element.id === 'delivery' ? deliveryInfoForRegion(region) : element.info
    const facts = compactFacts([info.summary, ...info.technicalFacts, ...info.qualifiers])
    const values = matrix.packageIds.map(key => comparisonValue(element.values[key])) as [string, string, string]
    // The renderer spans this note over the three value columns, keeping
    // general source facts separate from package-specific execution values.
    const factIndex = matrix.packageIds.findIndex(key => element.values[key]?.status === 'included')
    return { id: `${section.id}:${element.id}`, section: section.title,
      label: element.label, values,
      cells: matrix.packageIds.map(key => {
        const value = element.values[key]!
        return { status: value.status,
          label: ({ included: 'Входит', excluded: 'Не входит', notApplicable: 'Не применяется', requiresVerification: 'Уточняется' })[value.status],
          details: compactFacts([value.displayValue, value.material, ...value.technicalDetails]) }
      }),
      noteFacts: facts,
      ...(facts.length ? { note: `${factIndex >= 0 ? 'Для включённых комплектаций' : 'Справочно'}: ${facts.join('; ')}` } : {}) }
  }))
  // Coverage audit only: these placeholders do not extend the business matrix.
  // In particular, frame's "Основание пола" does not establish a finished floor.
  const requiredPositions = [
    ['structure', 'Силовой каркас', ['frame', 'wall']],
    ['roofing', 'Кровельное покрытие', ['roofing']],
    ['windows', 'Окна', ['windows']], ['doors', 'Входные двери', ['doors']],
    ['facade', 'Фасадная отделка', ['facade']], ['facadePaint', 'Покраска фасадной отделки', ['facadePaint']],
    ['interior', 'Внутренняя отделка', ['wallsFinish']],
    ['floorFinish', 'Напольное покрытие', project.technology === 'frame' ? [] : ['floor']],
    ['bathroom', 'Отделка санузлов', ['bathroom']], ['electric', 'Электрика', ['electric']],
    ['water', 'Водоснабжение', ['water']], ['sewer', 'Канализация', ['sewer']],
    ['heating', 'Отопление', ['heating']], ['ventilation', 'Вентиляция', ['ventilation']],
    ['additional', 'Дополнительные конструкции и работы', ['terrace', 'delivery', 'assembly']],
  ] as const
  const sourceIds = new Set(matrix.sections.flatMap(section => section.elements.map(element => element.id)))
  const sourceGaps = requiredPositions.filter(([, , ids]) => project.technology !== 'frame' && !ids.some(id => sourceIds.has(id)))
    .map(([id, label]) => ({ id, label, status: 'requiresVerification' as const, sourceStatus: 'needsVerification' as const }))
  for (const [index, gap] of sourceGaps.entries()) rows.push({ id: `source-gap:${gap.id}`, section: 'Пробелы исходных данных', label: gap.label,
    values: ['Уточняется', 'Уточняется', 'Уточняется'],
    ...(index === 0 ? { note: 'Пробелы исходных данных: нет данных в матрице, требует проверки для всех позиций этой категории.' } : {}) })
  if (matrix.packageIds.length !== 3 || matrix.packageIds.some((key, index) => key !== pricing.tiers[index]?.key)) return fail('comparison', 'Comparison columns do not match prices')
  const socials: { label: string; href: string }[] = FOOTER_SOCIALS.map(item => ({ label: item.label, href: webURL(footerSocialHref(item, region), 'social URL') }))
  let messengerPayload: unknown
  try { messengerPayload = await cms.read('/api/globals/lead-delivery/messengers') } catch { /* Site footer links remain the source when optional settings are unavailable. */ }
  if (messengerPayload !== undefined) {
    const settings = object(messengerPayload)
    for (const [key, label] of [['telegram', 'Telegram'], ['max', 'MAX'], ['whatsapp', 'WhatsApp']] as const) {
      const entry = object(settings[key])
      const index = socials.findIndex(item => item.label === label)
      if (index >= 0) socials.splice(index, 1)
      if (entry.enabled !== false) socials.push({ label, href: webURL(entry.href, `${key} URL`) })
    }
  }
  const phone = text(SITE.contacts.phone, 'phone')
  const digits = phone.replace(/\D/g, '')
  if (!/^\d{10,15}$/.test(digits)) return fail('contacts', 'Invalid contact phone')
  const email = text(SITE.contacts.email, 'email')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('contacts', 'Invalid contact email')
  const count = (value: unknown, field: string, min = 0) => typeof value === 'number' && Number.isInteger(value) && value >= min ? String(value) : fail('project', `Invalid ${field}`)
  if (!(project.areaValue > 0) || !Number.isFinite(project.areaValue)) return fail('project', 'Invalid area')
  // Validate the badge independently: technologyFromBadge defaults unknown values to panel.
  if (technologyLabel(project.technologyBadge) === '—' || technologyFromBadge(project.technologyBadge) !== project.technology) return fail('technology', 'Missing or inconsistent technology badge')
  const numericCount = (value: unknown, field: string) => {
    if (typeof value !== 'string' || !/^\d+$/.test(value)) return fail('project', `Missing ${field}`)
    return count(Number(value), field)
  }
  return {
    schemaVersion: 1,
    project: { slug, name: text(project.name, 'project name'), url: `https://avgst.ru/catalog/${slug}`, technology: project.technology, technologyLabel: ({ frame: "Каркасный", modular: "Модульный", panel: "Панельно-каркасный" })[project.technology],
      areaLabel: `${formatNumber(project.areaValue)} м²`, floorsLabel: count(project.floorsValue, 'floors', 1),
      bedroomsLabel: numericCount(project.bedrooms, 'bedrooms'), bathroomsLabel: numericCount(project.bathrooms, 'bathrooms'),
      heroImage: webURL(project.imageUrl, 'hero image', cms.origin) },
    region: { code: region, name: region === 'nn' ? copy.regionNn : copy.regionMsk }, pricing,
    plans: variants.map((variant, index) => ({ id: `plan-${index + 1}`, name: text(variant.label, 'plan name'),
      floors: variant.floors!.map((floor, floorIndex) => ({ id: `plan-${index + 1}-floor-${floorIndex + 1}`, name: text(floor.label, 'floor name'),
        image: webURL(floor.image, 'floor image', cms.origin), rooms: floor.rooms.map((room, roomIndex) => ({ number: roomIndex + 1,
          name: room.name.trim(), areaLabel: `${room.area.trim().replace(/\s*м[²2]$/, '')} м²` })) })) })),
    comparison: { rows, sourceGaps }, contacts: { company: text(SITE.name, 'company'), phone, phoneHref: `tel:+${digits}`, email,
      address: text(SITE.contacts.address, 'address'), website: 'https://avgst.ru', about: text(copy.footerAbout, 'about'),
      legal: text(SITE.footer.legal, 'legal'), updatedAt: formatDate(options.now ?? new Date()), socials },
    brand: { logo: 'logo_lg.svg' },
  }
}
