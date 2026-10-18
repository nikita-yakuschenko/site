import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { createLocalReq, getPayload } from 'payload'
import { blockTitles, structureOnlyBlocks, technicalBlocks } from '../src/config/block-titles'

if (process.env.NODE_ENV !== 'production') process.loadEnvFile('.env')
process.env.PAYLOAD_DB_PUSH = 'false'
process.env.CMS_SEED = '0'
const { default: config } = await import('../src/payload.config')
const apply = process.argv.includes('--apply')
const input = process.argv.find(value => value.startsWith('--input='))?.slice(8) || 'data/page-content-baseline.json'
type Field = { key: string; kind: 'text' | 'image' | 'link'; title: string; text?: string; image?: string; href?: string }
type Snapshot = { route: string; status?: number | string; blocks?: { key: string; fields: Field[] }[]; errors?: string[] }
const snapshots = JSON.parse(await readFile(input, 'utf8')) as Snapshot[]
if (snapshots.some(page => page.status !== 'redirect' && (page.status !== 200 || page.errors?.length))) throw new Error('Индекс содержит ошибки рендера; синхронизация запрещена')
const payload = await getPayload({ config })
const shared = new Set(['technicalHeader', 'mainHeader', 'footer', 'productionSection', 'contactsSection', 'independentReview', 'referralProgram', 'mortgageShowcase'])
const preserved = new Set(['hero', 'popularProjects', 'seriesBento'])
const sourceOrigin = process.env.SITE_PUBLIC_URL || 'https://new.avgst.ru'
const report: unknown[] = []

try {
  const admin = (await payload.find({ collection: 'users', where: { and: [{ role: { equals: 'super-admin' } }, { isBlocked: { equals: false } }] }, limit: 1 })).docs[0]
  if (!admin) throw new Error('Нет действующего суперадминистратора')
  const req = await createLocalReq({ user: { ...admin, collection: 'users' } }, payload)
  const pages = (await payload.find({ collection: 'pages', pagination: false, depth: 0, req, overrideAccess: false })).docs
  const blocks = (await payload.find({ collection: 'blocks', pagination: false, depth: 0, req, overrideAccess: false })).docs
  const media = (await payload.find({ collection: 'media', pagination: false, depth: 0, req, overrideAccess: false })).docs
  const byKey = new Map(blocks.map(block => [block.key, block]))
  const mediaSources = new Map(media.filter(item => item.description?.startsWith('cms-source:')).map(item => [item.description!.slice(11), item.id]))
  const publicRoot = process.argv.find(value => value.startsWith('--assets='))?.slice(9)
  const assets: string[] = []
  if (publicRoot) {
    const { readdir } = await import('node:fs/promises')
    for (const item of await readdir(publicRoot, { recursive: true })) assets.push(String(item).replaceAll('\\', '/'))
  }
  function sourceURL(value: string) {
    let url = new URL(value, sourceOrigin)
    if (url.pathname === '/_next/image' && url.searchParams.get('url')) url = new URL(url.searchParams.get('url')!, sourceOrigin)
    if (url.pathname.startsWith('/_next/static/media/')) {
      const name = path.posix.basename(url.pathname).replace(/\.[^.]+(\.[^.]+)$/, '$1')
      const matches = assets.filter(item => path.posix.basename(item) === name)
      const chosen = matches.length === 1 ? matches[0] : matches.find(item => item.startsWith('img/pages/'))
      if (chosen) return new URL(`/${chosen}`, sourceOrigin).href
    }
    return url.href
  }
  async function imageID(source: string, title: string) {
    const url = sourceURL(source)
    const old = mediaSources.get(url)
    if (old) return { id: old, url }
    const filename = decodeURIComponent(new URL(url).pathname.split('/').pop() || '')
    if (new URL(url).pathname.startsWith('/api/media/file/')) {
      const existing = media.find(item => item.filename === filename)
      if (existing) return { id: existing.id, url }
    }
    // SVG brand assets keep their original public URL. The existing upload
    // control can replace them with an approved raster image without enabling SVG uploads.
    if (!apply || !/\.(png|jpe?g|webp|avif)$/i.test(new URL(url).pathname)) return { url }
    const local = publicRoot && new URL(url).origin === new URL(sourceOrigin).origin ? path.join(publicRoot, decodeURIComponent(new URL(url).pathname)) : null
    let data: Buffer
    try {
      if (local) data = await readFile(local)
      else {
        const response = await fetch(url, { signal: AbortSignal.timeout(30000) })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        data = Buffer.from(await response.arrayBuffer())
      }
    } catch { return { url } }
    const extension = path.extname(filename).toLowerCase()
    const mimetype = extension === '.jpg' || extension === '.jpeg' ? 'image/jpeg' : `image/${extension.slice(1)}`
    const item = await payload.create({ collection: 'media', data: { title, alt: title, description: `cms-source:${url}` }, file: { data, mimetype, name: filename, size: data.length }, req, overrideAccess: false })
    mediaSources.set(url, item.id)
    return { id: item.id, url }
  }

  if (apply) for (const block of blocks) if (block.key && blockTitles[block.key] && block.title === block.key) {
    const updated = await payload.update({ collection: 'blocks', id: block.id, data: { title: blockTitles[block.key] }, req, overrideAccess: false })
    byKey.set(block.key, updated)
  }
  for (const snapshot of snapshots) {
    const page = pages.find(page => page.route === snapshot.route)
    if (!page || page.kind === 'redirect') continue
    if (page.kind === 'template' || page.kind === 'preview') {
      if (apply) {
        const layout = (page.layout || []).filter(row => {
          if (row.component.relationTo !== 'blocks') return true
          const id = typeof row.component.value === 'object' ? row.component.value.id : row.component.value
          return !technicalBlocks.has(blocks.find(block => block.id === id)?.key || '')
        }).map(row => {
          if (row.component.relationTo !== 'blocks') return row
          const id = typeof row.component.value === 'object' ? row.component.value.id : row.component.value
          const key = blocks.find(block => block.id === id)?.key
          const replacement = key === 'ContactsSection' ? byKey.get('contactsSection') : key === 'ProjectPreview' ? byKey.get('ProjectHeroContent') : null
          return replacement ? { ...row, component: { relationTo: 'blocks' as const, value: replacement.id } } : row
        })
        const ids = (rows: typeof layout) => rows.map(row => `${row.component.relationTo}:${typeof row.component.value === 'object' ? row.component.value.id : row.component.value}`)
        if (JSON.stringify(ids(layout)) !== JSON.stringify(ids(page.layout || []))) await payload.update({ collection: 'pages', id: page.id, data: { layout }, req, overrideAccess: false })
      }
      continue
    }
    const layout: { component: { relationTo: 'blocks'; value: number } }[] = []
    const seen = new Set<string>()
    if (page.route === '/' && apply) {
      // These cards already have a database-backed editor. Never flatten their
      // selected collection or calculated project count into generic text.
      for (const block of blocks.filter(block => block.key?.startsWith('PhotoTile-instance-') && (block.defaults as { contentScope?: string } | null)?.contentScope === '/')) {
        if ((block.defaults as { contentBinding?: string } | null)?.contentBinding === 'react') await payload.update({ collection: 'blocks', id: block.id, data: { defaults: { ...(block.defaults as Record<string, unknown>), contentBinding: 'managed-by-series' } }, req, overrideAccess: false })
      }
      const series = byKey.get('seriesBento')
      if (series) {
        let changed = false
        const parts = await Promise.all((series.parts || []).map(async part => {
          if (!/^seriesBento\.slot\.\d+$/.test(part.key) || part.image) return part
          const group = part.href === 'panel' || part.href === 'modular' ? 'tech' : 'series'
          const captured = byKey.get(`PhotoTile-instance--catalog-${group}-${part.href}-page-${page.id}`)
          const existingImage = captured?.parts?.find(item => item.key.endsWith('.image'))?.image
          const fallback = existingImage ? null : await imageID(`/series/${part.href}.jpg`, part.title || 'Превью подборки')
          const image = existingImage || (fallback && 'id' in fallback ? fallback.id : null)
          if (!image) return part
          changed = true
          return { ...part, image }
        }))
        if (changed) byKey.set('seriesBento', await payload.update({ collection: 'blocks', id: series.id, data: { parts }, req, overrideAccess: false }))
      }
    }
    for (const captured of snapshot.blocks || []) {
      const base = captured.key.split('-page-')[0]!
      if (page.route === '/' && base.startsWith('PhotoTile-instance-')) continue
      if (seen.has(base) || !captured.fields.length && !structureOnlyBlocks.has(base)) continue
      seen.add(base)
      const key = shared.has(base) ? base : `${base}-page-${page.id}`
      const original = byKey.get(base) || byKey.get(base.split('-instance-')[0])
      const existing = byKey.get(key)
      const heading = captured.fields.find(field => field.title === 'Заголовок' && field.text?.trim())?.text
      const title = blockTitles[base] || blockTitles[base.split('-instance-')[0]!] || heading?.trim().replace(/\s+/g, ' ').slice(0, 90) || `Раздел страницы «${page.title}»`
      const current = new Map((existing?.parts || []).map(part => [part.key, part]))
      const parts = []
      for (const field of captured.fields) {
        const partKey = field.key.replace(`${captured.key}.`, `${key}.`)
        const previous = current.get(partKey)
        if (previous) { parts.push(previous); continue }
        if ((existing?.defaults as { contentKeys?: string[] } | null)?.contentKeys?.includes(partKey)) continue
        const detail = field.kind === 'text' ? field.text?.trim().replace(/\s+/g, ' ').slice(0, 72) : ''
        const partTitle = detail ? `${field.title}: ${detail}` : field.title
        const image = field.kind === 'image' && field.image ? await imageID(field.image, partTitle) : null
        parts.push({ key: partKey, title: partTitle, ...(field.kind === 'text' ? { text: field.text ?? '' } : field.kind === 'link' ? { href: field.href ?? '' } : { textMore: image?.url || '', ...(image && 'id' in image ? { image: image.id } : {}) }) })
      }
      for (const part of existing?.parts || []) if (part.key.startsWith(`${key}.content.gallery.`) && !parts.some(item => item.key === part.key)) parts.push(part)
      if (existing) {
        const order = new Map((existing.parts || []).map((part, index) => [part.key, index]))
        parts.sort((left, right) => (order.get(left.key) ?? Number.MAX_SAFE_INTEGER) - (order.get(right.key) ?? Number.MAX_SAFE_INTEGER))
      }
      const defaults = { ...(original?.defaults as Record<string, unknown> || {}), ...(existing?.defaults as Record<string, unknown> || {}), contentScope: shared.has(base) ? '' : page.route, contentBinding: 'react', contentGallery: captured.fields.some(field => field.key.includes('.content.gallery.')), contentKeys: captured.fields.map(field => field.key.replace(`${captured.key}.`, `${key}.`)), ...(structureOnlyBlocks.has(base) ? { structureOnly: true } : {}) }
      const data = { key, title, source: original?.source || page.source || 'src/components/cms-content.tsx', exportName: original?.exportName || base, defaults, parts }
      report.push({ route: page.route, key, title, parts: parts.length, operation: existing ? 'update' : 'create' })
      if (apply) {
        const saved = existing ? await payload.update({ collection: 'blocks', id: existing.id, data, req, overrideAccess: false }) : await payload.create({ collection: 'blocks', data, req, overrideAccess: false })
        byKey.set(key, saved)
        layout.push({ component: { relationTo: 'blocks', value: saved.id } })
      }
    }
    if (apply && layout.length) {
      // Keep the already connected home editors in their original positions.
      if (page.route === '/') {
        for (const row of page.layout || []) {
          if (row.component.relationTo !== 'blocks') continue
          const id = typeof row.component.value === 'object' ? row.component.value.id : row.component.value
          const old = blocks.find(block => block.id === id)
          if (old?.key && preserved.has(old.key)) layout.splice(Math.min(old.key === 'hero' ? 2 : old.key === 'popularProjects' ? 3 : 4, layout.length), 0, { component: { relationTo: 'blocks', value: old.id } })
        }
      }
      const before = (page.layout || []).map(row => row.component.relationTo === 'blocks' ? typeof row.component.value === 'object' ? row.component.value.id : row.component.value : `form:${row.component.value}`)
      const after = layout.map(row => row.component.value)
      if (JSON.stringify(before) !== JSON.stringify(after)) await payload.update({ collection: 'pages', id: page.id, data: { layout }, req, overrideAccess: false })
    }
  }
  console.log(JSON.stringify({ apply, records: report.length, report }, null, 2))
} finally { await payload.destroy() }
process.exit(0)
