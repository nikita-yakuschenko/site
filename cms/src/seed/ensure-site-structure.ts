import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { Payload } from 'payload'
import { CATALOG_PROJECTS } from '../../../src/lib/catalog/projects'
import type { CatalogProject } from '../../../src/lib/catalog/types'
import { priceKinds } from '../config/price-kinds'
import { normalizeConfigurations } from '../config/project-configurations'
import { chromeByKey, heroParts, siteIndex, sitePages, type SiteDefinition } from './standard-site'

const sampleFlag = 'sampleSeeded'
const mimeByExtension: Record<string, string> = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.avif': 'image/avif' }
const uploaded = new Map<string, { id: number; url: string }>()
let running: Promise<void> | undefined

export function ensureSiteStructure(payload: Payload) {
  running ??= run(payload).catch(error => {
    running = undefined
    throw error
  })
  return running
}

async function run(payload: Payload) {
  const refs = new Map<string, { relationTo: 'blocks' | 'forms'; value: number }>()
  let createdBlocks = 0
  let createdPages = 0
  for (const kind of ['forms', 'blocks'] as const) {
    const existing = await payload.find({ collection: kind, pagination: false, depth: 0, limit: 1000, overrideAccess: true })
    const byKey = new Map(existing.docs.map(doc => [doc.key, doc]))
    for (const definition of siteIndex.definitions.filter(item => item.kind === kind)) {
      const found = byKey.get(definition.key)
      const doc = found ?? await createMissing(payload, kind, definition.key, blockData(definition, refs))
      if (!found) createdBlocks += kind === 'blocks' ? 1 : 0
      if (kind === 'blocks' && found && !(found.parts || []).length && definition.key !== 'ProjectConfig') {
        const parts = partsFor(definition.key)
        if (parts.length) await payload.update({ collection: 'blocks', id: found.id, data: { parts }, overrideAccess: true })
      }
      refs.set(definition.key, { relationTo: kind, value: doc.id })
    }
  }
  for (const [key, chrome] of chromeByKey) {
    if (refs.has(key)) continue
    const found = await payload.find({ collection: 'blocks', where: { key: { equals: key } }, limit: 1, depth: 0, overrideAccess: true })
    const doc = found.docs[0] ?? await createMissing(payload, 'blocks', key, { title: chrome.title, key, source: 'src/components/site-chrome.tsx', exportName: 'SiteChrome', parts: [...chrome.parts], ...('shared' in chrome && chrome.shared ? { defaults: { shared: true } } : {}) })
    refs.set(key, { relationTo: 'blocks', value: doc.id })
    if (!found.docs[0]) createdBlocks += 1
  }
  const pages = await payload.find({ collection: 'pages', pagination: false, depth: 0, limit: 500, overrideAccess: true })
  const pageKeys = new Set(pages.docs.map(page => page.importKey).filter((key): key is string => Boolean(key)))
  for (const page of sitePages) {
    const importKey = `${page.source}:${page.route}`
    if (pageKeys.has(importKey)) continue
    const rows = page.kind === 'redirect' ? [] : ['technicalHeader', 'mainHeader'].flatMap(key => componentRow(refs, key))
    const content = page.route === '/'
      ? siteIndex.homeBlocks.filter(block => block.blockType !== 'advantagesBar').flatMap(block => componentRow(refs, block.blockType, block))
      : page.components.flatMap(key => componentRow(refs, key, key === 'MortgageCalculator' && page.route === '/catalog/[slug]' ? { showMatches: false, initialProgramId: 'family', recordType: 'project', priceSource: 'configurations.standard.price', mortgageEligibilitySource: 'configurations.mortgage' } : undefined))
    const footer = page.kind === 'redirect' ? [] : componentRow(refs, 'footer')
    await payload.create({
      collection: 'pages',
      draft: false,
      overrideAccess: true,
      data: { importKey, title: page.title, metaTitle: page.title, route: page.route, kind: page.kind as 'page', redirect: page.redirect, source: page.source, layout: [...rows, ...content, ...footer], _status: 'published' },
    })
    createdPages += 1
  }
  const samples = await ensureSampleProjects(payload)
  await attachContentPhotos(payload)
  console.log(`Структура сайта: страниц +${createdPages}, блоков +${createdBlocks}. ${samples}`)
}

function isUniqueValue(error: unknown) {
  const data = error && typeof error === 'object' && 'data' in error ? (error as { data?: { errors?: { message?: string }[] } }).data : undefined
  return Boolean(data?.errors?.some(item => item.message === 'Значение должно быть уникальным'))
}

async function createMissing(payload: Payload, collection: 'blocks' | 'forms', key: string, data: Record<string, unknown>) {
  try {
    if (collection === 'blocks') return await payload.create({ collection: 'blocks', data: data as never, overrideAccess: true })
    return await payload.create({ collection: 'forms', data: data as never, overrideAccess: true })
  } catch (error) {
    if (!isUniqueValue(error)) throw error
    const again = await payload.find({ collection, where: { key: { equals: key } }, limit: 1, depth: 0, overrideAccess: true })
    if (again.docs[0]) return again.docs[0]
    throw error
  }
}

function componentRow(refs: Map<string, { relationTo: 'blocks' | 'forms'; value: number }>, key: string, parameters?: Record<string, unknown>) {
  const component = refs.get(key)
  return component ? [{ component, ...(parameters ? { parameters } : {}) }] : []
}

function partsFor(key: string) {
  if (key === 'hero') return heroParts
  return chromeByKey.get(key)?.parts || []
}

function blockData(definition: SiteDefinition, refs: Map<string, { relationTo: 'blocks' | 'forms'; value: number }>) {
  const chrome = chromeByKey.get(definition.key)
  const parts = partsFor(definition.key)
  return {
    title: chrome?.title || definition.title,
    key: definition.key,
    source: definition.source,
    exportName: definition.exportName,
    ...(definition.kind === 'blocks' ? { forms: definition.forms.flatMap(key => refs.get(key)?.value ?? []) } : {}),
    ...(parts.length && definition.key !== 'ProjectConfig' ? { parts } : {}),
    ...(chrome?.shared ? { defaults: { shared: true } } : {}),
  }
}

function publicDirectory() {
  // The bundled server has no import.meta.dirname. A missing catalog must skip uploads, not crash startup.
  const fromHere = import.meta.dirname ? path.resolve(import.meta.dirname, '../../../public') : ''
  return [path.resolve(process.cwd(), '../public'), path.resolve(process.cwd(), 'public'), fromHere]
    .filter(directory => directory.length > 0)
    .find(directory => existsSync(path.join(directory, 'catalog')))
}

// Same pipeline as the project gallery uploader: POST /api/media converts to WebP and stores a media row.
async function uploadRepoImage(payload: Payload, publicPath: string) {
  const cached = uploaded.get(publicPath)
  if (cached) return cached
  const root = publicDirectory()
  const extension = path.extname(publicPath).toLowerCase()
  const absolute = root ? path.join(root, publicPath.replace(/^\//, '')) : ''
  if (!root || !mimeByExtension[extension] || !existsSync(absolute)) return null
  const marker = `repo:${publicPath}`
  const existing = await payload.find({ collection: 'media', where: { description: { equals: marker } }, limit: 1, depth: 0, overrideAccess: true })
  if (existing.docs[0]) {
    const found = { id: existing.docs[0].id, url: existing.docs[0].url || publicPath }
    uploaded.set(publicPath, found)
    return found
  }
  const data = await readFile(absolute)
  const created = await payload.create({
    collection: 'media',
    data: { alt: path.basename(absolute, extension), description: marker },
    file: { data, mimetype: mimeByExtension[extension], name: path.basename(absolute), size: data.length },
    overrideAccess: true,
  })
  const stored = { id: created.id, url: created.url || publicPath }
  uploaded.set(publicPath, stored)
  return stored
}

function photoRow(publicPath: string, file: { id: number } | null | undefined, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return file ? { ...extra, photo: file.id } : { ...extra, image: publicPath }
}

async function ensureSampleProjects(payload: Payload) {
  const marker = await payload.find({ collection: 'blocks', where: { key: { equals: 'ProjectConfig' } }, limit: 1, depth: 0, overrideAccess: true })
  const config = marker.docs[0]
  const defaults = config?.defaults && typeof config.defaults === 'object' ? config.defaults as Record<string, unknown> : {}
  if (defaults[sampleFlag] === true) return 'Тестовые проекты уже создавались.'
  const existing = await payload.find({ collection: 'projects', pagination: false, depth: 0, limit: 1000, overrideAccess: true })
  // Пустой черновик без ключа и адреса — не каталог. Иначе первый заход в форму блокирует тестовые проекты.
  const realCatalog = existing.docs.some(project => {
    const key = String(project.importKey || '')
    if (key.startsWith('sample:')) return false
    return Boolean(key || project.slug)
  })
  if (realCatalog) {
    if (config) await payload.update({ collection: 'blocks', id: config.id, data: { defaults: { ...defaults, [sampleFlag]: true } }, overrideAccess: true })
    return 'Каталог уже заполнен, тестовые проекты не добавлялись.'
  }
  const panel = CATALOG_PROJECTS.find(project => project.slug === 'barnhouse-115')
  const modular = CATALOG_PROJECTS.find(project => project.slug === 'cube-100')
  if (!panel || !modular) throw new Error('В коде каталога нет домов для тестовых проектов')
  const created = []
  for (const sample of [
    { source: panel, importKey: 'sample:panel', slug: 'panelny-1', name: 'Панельный 1', series: 'panel' as const },
    { source: modular, importKey: 'sample:modular', slug: 'modulny-1', name: 'Модульный 1', series: 'modular' as const },
  ]) {
    if (existing.docs.some(project => project.importKey === sample.importKey)) continue
    created.push(await createSample(payload, sample))
  }
  if (config) await payload.update({ collection: 'blocks', id: config.id, data: { defaults: { ...defaults, [sampleFlag]: true } }, overrideAccess: true })
  return `Тестовых проектов +${created.length}.`
}

async function createSample(payload: Payload, sample: { source: CatalogProject; importKey: string; slug: string; name: string; series: 'panel' | 'modular' }) {
  const source = sample.source
  const paths = [...new Set([
    source.imageUrl,
    ...(source.mobileImageUrl ? [source.mobileImageUrl] : []),
    ...source.exteriors,
    ...source.interiors,
    ...source.floorPlans,
    ...(source.plans || []).flatMap(variant => [variant.image, ...(variant.floors || []).map(floor => floor.image)].filter((image): image is string => Boolean(image))),
    ...(source.built || []).map(photo => photo.image),
    ...(!source.built?.length ? source.exteriors.slice(0, 3) : []),
  ])]
  for (const publicPath of paths) await uploadRepoImage(payload, publicPath)
  const file = (publicPath?: string | null) => publicPath ? uploaded.get(publicPath) : undefined
  const badge = source.technology === 'modular' ? 'Модульный' : 'Панельно-каркасный'
  const base = source.priceAmount || 5_000_000
  const tierPrice = (key: string) => Math.round(base * ({ start: 0.82, standard: 1, project: 1.18, turnkey: 1.35 }[key] ?? 1) / 1000) * 1000
  const configurations = normalizeConfigurations(
    ['start', 'standard', 'project', 'turnkey'].map(key => ({ key, price: tierPrice(key) })),
    badge,
  )
  const plans = source.plans?.length
    ? source.plans.map(variant => {
      const image = variant.image || variant.floors?.[0]?.image || source.floorPlans[0]
      const rooms = (variant.rooms?.length ? variant.rooms : variant.floors?.[0]?.rooms) || []
      return { floors: [{ ...photoRow(image || source.imageUrl, image ? file(image) : undefined), rooms: rooms.map(room => ({ name: room.name, area: room.area })) }] }
    })
    : source.floorPlans.map(image => ({ floors: [{ ...photoRow(image, file(image)), rooms: [{ name: 'Кухня-гостиная', area: '24,0 м²' }, { name: 'Спальня', area: '12,0 м²' }, { name: 'Санузел', area: '4,5 м²' }] }] }))
  const builtPhotos = source.built?.length ? source.built : source.exteriors.slice(0, 3).map((image, index) => ({ image, caption: `Снимок ${index + 1}` }))
  const cover = builtPhotos[0]?.image || source.imageUrl
  const hero = file(source.imageUrl)
  const mobile = file(source.mobileImageUrl || source.exteriors[1] || source.imageUrl)
  const project = await payload.create({
    collection: 'projects',
    draft: false,
    overrideAccess: true,
    data: {
      importKey: sample.importKey,
      name: sample.name,
      slug: sample.slug,
      recordType: 'project',
      description: source.description,
      searchDescription: `${sample.name}. ${source.description}`,
      technologyBadge: badge,
      series: sample.series,
      areaValue: source.areaValue,
      floorsValue: source.floorsValue,
      bedrooms: Number(source.bedrooms),
      bathrooms: Number(source.bathrooms),
      priceAmount: tierPrice('standard'),
      imageUrl: hero?.url || source.imageUrl,
      mobileImageUrl: mobile?.url || source.mobileImageUrl || source.exteriors[1] || source.imageUrl,
      ...(hero ? { desktopImage: hero.id } : {}),
      ...(mobile ? { mobileImage: mobile.id } : {}),
      contentImported: true,
      configurationsImported: true,
      configurations,
      exteriors: source.exteriors.map(image => photoRow(image, file(image))),
      interiors: source.interiors.map(image => photoRow(image, file(image))),
      floorPlans: source.floorPlans.map(image => ({ image: file(image)?.url || image })),
      plans,
      built: [
        ...builtPhotos.map(photo => ({ type: 'photo' as const, caption: photo.caption || null, ...photoRow(photo.image, file(photo.image)) })),
        { type: 'video' as const, videoUrl: 'https://kinescope.io/npS4zk5fgxhM7XbFGRkoq7', caption: 'Обзор построенного дома', ...photoRow(cover, file(cover)) },
      ],
      options: [
        { key: 'terrace', name: 'Терраса', price: 180000, defaultSelected: false },
        { key: 'canopy', name: 'Навес', price: 95000, defaultSelected: true },
      ],
      about: [
        { title: 'О проекте', text: source.description, image: hero?.url || source.imageUrl },
        { title: 'Как его строят', text: 'Домокомплект изготавливается на производстве и собирается на участке.', image: file(source.exteriors[1])?.url || source.exteriors[1] || source.imageUrl },
      ],
      _status: 'published',
    },
  })
  for (const configuration of project.configurations || []) {
    for (const kind of priceKinds) {
      const factor = ({ msk: 1, nn: 0.94, special: 0.86, 'special-msk': 0.9, dealer: 0.78 } as const)[kind.value]
      await payload.create({
        collection: 'project-prices',
        overrideAccess: true,
        draft: false,
        data: { lookupKey: `${project.id}:${configuration.key}:${kind.value}`, project: project.id, configuration: configuration.key, region: kind.value, price: Math.max(1000, Math.round((configuration.price || tierPrice('standard')) * factor / 1000) * 1000) },
      })
    }
  }
  return { name: sample.name, code: project.code }
}

// Photographs a block is meant to show. Interface marks stay in the Next.js code and are not uploaded.
const contentPhotos: { block: string; key: string; title: string; file: string }[] = [
  { block: 'hero', key: 'hero.background', title: 'Фоновое изображение', file: '/fixtures/hero-forest.jpg' },
  { block: 'hero', key: 'hero.promo.0', title: 'Льготная ипотека на дом', file: '/promo/mortgage-promo.webp' },
  { block: 'hero', key: 'hero.promo.1', title: 'Выставка готовых домов', file: '/fixtures/house-1.jpg' },
  { block: 'hero', key: 'hero.promo.2', title: 'Производство домов', file: '/fixtures/factory.jpg' },
  { block: 'seriesBento', key: 'seriesBento.slot.0', title: 'Панельно-каркасные дома', file: '/series/panel.jpg' },
  { block: 'seriesBento', key: 'seriesBento.slot.1', title: 'Барнхаусы', file: '/series/barn.jpg' },
  { block: 'seriesBento', key: 'seriesBento.slot.2', title: 'Классика', file: '/series/classic.jpg' },
  { block: 'seriesBento', key: 'seriesBento.slot.3', title: 'Модульные дома', file: '/series/modular.jpg' },
  { block: 'AboutTimeline', key: 'history.2016', title: '2016', file: '/img/about/forum-2016.png' },
  { block: 'AboutTimeline', key: 'history.2019', title: '2019', file: '/img/about/inyutino-2019.jpg' },
  { block: 'AboutTimeline', key: 'history.2020', title: '2020', file: '/img/about/paint-shop-2020.png' },
  { block: 'AboutTimeline', key: 'history.2021.0', title: '2021', file: '/fixtures/factory.jpg' },
  { block: 'AboutTimeline', key: 'history.2021.1', title: '2021', file: '/img/about/avangard-2021.jpg' },
  { block: 'AboutTimeline', key: 'history.2022.0', title: '2022', file: '/production/factory.jpg' },
  { block: 'AboutTimeline', key: 'history.2022.1', title: '2022', file: '/img/about/open-village-2022-aerial.png' },
  { block: 'AboutTimeline', key: 'history.2022.2', title: '2022', file: '/img/about/open-village-2022-team.png' },
  { block: 'AboutTimeline', key: 'history.2023', title: '2023', file: '/img/about/open-village-2023.jpg' },
  { block: 'AboutTimeline', key: 'history.2024', title: '2024', file: '/ranking.png' },
  { block: 'AboutTimeline', key: 'history.2025', title: '2025', file: '/img/pages/vysokiy-kvartal-aerial.webp' },
  { block: 'AboutTimeline', key: 'history.2026', title: '2026', file: '/img/pages/uzor128..jpg' },
  { block: 'AboutTimeline', key: 'about.cover', title: 'Обложка', file: '/img/pages/exposition-main.jpg' },
  { block: 'AboutCompanyBento', key: 'bento.project', title: 'Проект', file: '/img/pages/about-bento-project.png' },
  { block: 'AboutCompanyBento', key: 'bento.equipment', title: 'Оборудование', file: '/img/pages/wbz.png' },
  { block: 'AboutCompanyBento', key: 'bento.modular', title: 'Модульная технология', file: '/img/pages/modular_tech.png' },
  { block: 'AboutCompanyBento', key: 'bento.panel', title: 'Панельно-каркасная технология', file: '/img/pages/panel_tech.png' },
  { block: 'AboutCompanyBento', key: 'bento.industrial', title: 'Индустриальный подход', file: '/img/pages/industrial.png' },
  { block: 'AboutCompanyBento', key: 'bento.business', title: 'Решения для бизнеса', file: '/img/pages/B2B.png' },
  { block: 'AboutCompanyBento', key: 'bento.bureau', title: 'Архитектурное бюро', file: '/img/pages/care.png' },
]

async function attachContentPhotos(payload: Payload) {
  const byBlock = new Map<string, typeof contentPhotos>()
  for (const photo of contentPhotos) {
    const group = byBlock.get(photo.block) || []
    group.push(photo)
    byBlock.set(photo.block, group)
  }
  for (const [key, photos] of byBlock) {
    const block = (await payload.find({ collection: 'blocks', where: { key: { equals: key } }, limit: 1, depth: 0, overrideAccess: true })).docs[0]
    if (!block) continue
    const parts = [...(block.parts || [])]
    let changed = false
    for (const photo of photos) {
      const file = await uploadRepoImage(payload, photo.file)
      if (!file) continue
      const index = parts.findIndex(part => part.key === photo.key)
      const current = index >= 0 ? parts[index] : undefined
      const image = typeof current?.image === 'number' ? current.image : current?.image && typeof current.image === 'object' ? current.image.id : null
      if (image) continue
      const next = { ...(current || { key: photo.key, title: photo.title }), image: file.id }
      if (index >= 0) parts[index] = next
      else parts.push(next)
      changed = true
    }
    if (changed) await payload.update({ collection: 'blocks', id: block.id, data: { parts }, overrideAccess: true })
  }
  const mobile = await uploadRepoImage(payload, '/fixtures/hero-forest-mobile.jpg')
  if (!mobile) return
  const hero = (await payload.find({ collection: 'blocks', where: { key: { equals: 'hero' } }, limit: 1, depth: 0, overrideAccess: true })).docs[0]
  const background = hero?.parts?.find(part => part.key === 'hero.background')
  const imageMobile = typeof background?.imageMobile === 'number' ? background.imageMobile : background?.imageMobile && typeof background.imageMobile === 'object' ? background.imageMobile.id : null
  if (!hero?.parts || imageMobile) return
  await payload.update({
    collection: 'blocks',
    id: hero.id,
    overrideAccess: true,
    data: { parts: hero.parts.map(part => part.key === 'hero.background' ? { ...part, imageMobile: mobile.id } : part) },
  })
}
