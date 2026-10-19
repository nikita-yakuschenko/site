'use client'
import { useDocumentInfo, useForm, useFormFields } from '@payloadcms/ui'
import { useEffect, useRef, useState } from 'react'
import { IconExternalLink, IconRefresh, IconDeviceDesktop, IconDeviceMobile, IconDeviceTablet, IconMaximize, IconBrowser } from '@tabler/icons-react'
import { Button } from '../ui/button'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '../ui/empty'
import { type PreviewImage } from './ImagePreviewOverlay'
import { useGalleryPreview } from './useGalleryPreview'
import { usePlansPreview } from './usePlansPreview'
import { useBuiltPreview } from './useBuiltPreview'
import { useStoryPreview } from './useStoryPreview'
import { normalizeNextStepsSettings, type NextStepsSettings } from '../../config/next-steps-settings'
import type { ConfigurationTemplatesData } from '../../../../src/lib/catalog/configuration-content'
import type { ConfigurationKey } from '../../../../src/lib/catalog/configuration-rules'
import { isCatalogSeries, type CatalogProject } from '../../../../src/lib/catalog/types'
import { isTechnologyCollection } from '../../../../src/lib/catalog/collection'
const devices = [
  { key: 'desktop', label: 'Десктоп', width: 1920, height: 1080, icon: IconDeviceDesktop },
  { key: 'tablet-landscape', label: 'Планшет горизонтально', width: 1180, height: 820, icon: IconDeviceTablet },
  { key: 'tablet-portrait', label: 'Планшет вертикально', width: 820, height: 1180, icon: IconDeviceTablet },
  { key: 'mobile', label: 'Телефон', width: 390, height: 844, icon: IconDeviceMobile },
] as const
const homeBlocks = new Set(['hero', 'advantagesBar', 'popularProjects', 'seriesBento', 'productionSection', 'mortgageShowcase', 'independentReview', 'videoTestimonials', 'referralProgram', 'contactsSection', 'leadForm', 'technicalHeader', 'mainHeader', 'footer'])
function previewCard(doc: { id?: string; slug?: string | null; name?: string | null; importKey?: string | null; areaValue?: number | null; floorsValue?: number | null; bedrooms?: number | null; bathrooms?: number | null; technologyBadge?: string | null; series?: string | null; priceAmount?: number | null; imageUrl?: string | null; desktopImage?: { url?: string | null } | string | null }): CatalogProject | null {
  if (!doc.id || !doc.slug || !doc.name) return null
  const photo = doc.desktopImage && typeof doc.desktopImage === 'object' ? doc.desktopImage.url : ''
  const imageUrl = photo ? new URL(photo, window.location.origin).href : doc.imageUrl || ''
  const price = doc.priceAmount && doc.priceAmount > 0 ? doc.priceAmount : null
  const seriesName = doc.series || ''
  const series = isCatalogSeries(seriesName) ? seriesName : 'panel'
  return { id: doc.importKey?.replace(/^catalog:/, '') || `cms:${doc.id}`, cmsId: doc.id, slug: doc.slug, name: doc.name, href: `/catalog/${doc.slug}`, area: String(doc.areaValue ?? ''), areaValue: doc.areaValue ?? 0, floors: String(doc.floorsValue ?? ''), floorsValue: doc.floorsValue ?? 0, bedrooms: String(doc.bedrooms ?? ''), bathrooms: String(doc.bathrooms ?? ''), technology: series === 'modular' ? 'modular' : 'panel', technologyBadge: doc.technologyBadge || '', series, imageUrl, priceAmount: price, priceLabel: price ? `от ${price.toLocaleString('ru-RU')} руб.` : 'Цена уточняется', description: doc.name, about: [], exteriors: [], interiors: [], floorPlans: [], options: [] }
}
const catalogBlocks = new Set(['projectHero', 'ProjectHeroContent', 'ProjectHeroPayment', 'ReadyHomeOffer', 'ContactsSection', 'ProjectExteriors', 'ProjectInteriors', 'ProjectPlans', 'ProjectBuilt', 'ProjectConfig', 'ProjectSimilar', 'MortgageCalculator', 'ProjectNextSteps'])
function seriesPreview(parts: { key: string; text: string; href: string; image: string }[], counts: Map<string, number>, images: Map<string, string>) {
  return {
    type: 'avgst:preview-series' as const,
    heading: parts.find(part => part.key === 'seriesBento.heading')?.text || '',
    button: parts.find(part => part.key === 'seriesBento.button')?.text || '',
    tiles: parts.filter(part => /^seriesBento\.slot\.\d+$/.test(part.key)).map(part => ({ title: part.text, series: part.href, image: part.image ? images.get(part.image) || '' : '', count: counts.get(part.href) || 0 })),
  }
}

export function PagePreview({ siteUrl, project = false, story = false, configuration, isolateBlock = false }: { siteUrl: string; project?: boolean; story?: boolean; configuration?: { variant: 'panel' | 'modular'; tier: ConfigurationKey }; isolateBlock?: boolean }) {
  const { data, hasPublishedDoc } = useDocumentInfo()
  const blockKey = useFormFields(([fields]) => isolateBlock ? String(fields.key?.value || '') : '')
  const blockTitle = useFormFields(([fields]) => isolateBlock ? String(fields.title?.value || '') : '')
  const contentScope = useFormFields(([fields]) => isolateBlock ? String((fields.defaults?.value as { contentScope?: string } | undefined)?.contentScope || '') : '')
  const contentDraft = useFormFields(([fields]) => {
    if (!isolateBlock) return ''
    const count = (fields.parts as { rows?: unknown[] } | undefined)?.rows?.length || 0
    const parts = []
    for (let index = 0; index < count; index++) {
      const row = `parts.${index}`
      const key = String(fields[`${row}.key`]?.value || '')
      if (key.includes('.content.')) {
        const person = key.endsWith('.person')
        parts.push({ key, text: String(fields[`${row}.text`]?.value ?? ''), textMore: String(fields[`${row}.textMore`]?.value ?? ''), href: String(fields[`${row}.href`]?.value ?? ''), imageId: fields[`${row}.image`]?.value, image: person ? '' : String(fields[`${row}.textMore`]?.value || ''), originalImage: person ? '' : String(fields[`${row}.textMore`]?.value || '') })
      }
    }
    return JSON.stringify(parts)
  })
  const contentDraftRef = useRef<unknown[]>([])
  useEffect(() => {
    if (!contentDraft || !blockKey) return
    let cancelled = false
    const parts = JSON.parse(contentDraft) as { key: string; imageId?: unknown; image: string }[]
    Promise.all(parts.map(async part => {
      const id = part.imageId && typeof part.imageId === 'object' && 'id' in part.imageId ? part.imageId.id : part.imageId
      if (!id) return part
      const response = await fetch(`/api/media/${id}?depth=0`, { credentials: 'include' })
      const media = response.ok ? await response.json() : null
      return { ...part, image: media?.url ? new URL(media.url, window.location.origin).href : part.image }
    })).then(parts => {
      if (cancelled) return
      contentDraftRef.current = parts
      frame.current?.contentWindow?.postMessage({ type: 'avgst:preview-content', key: blockKey, parts }, new URL(siteUrl).origin)
    })
    return () => { cancelled = true }
  }, [contentDraft, blockKey, siteUrl])
  const heroParts = useFormFields(([fields]) => {
    if (!isolateBlock || String(fields.key?.value || '') !== 'hero') return ''
    const rows = (fields.parts as { rows?: unknown[] } | undefined)?.rows
    const count = Array.isArray(rows) ? rows.length : 0
    const parts = []
    for (let index = 0; index < count; index++) parts.push({ key: String(fields[`parts.${index}.key`]?.value || ''), text: String(fields[`parts.${index}.text`]?.value || ''), textMore: String(fields[`parts.${index}.textMore`]?.value || ''), href: String(fields[`parts.${index}.href`]?.value || '') })
    return JSON.stringify(parts)
  })
  const heroPartsRef = useRef(heroParts)
  heroPartsRef.current = heroParts
  const popularParts = useFormFields(([fields]) => {
    if (String(fields.key?.value || '') !== 'popularProjects') return ''
    const rows = (fields.parts as { rows?: unknown[] } | undefined)?.rows
    const count = Array.isArray(rows) ? rows.length : 0
    const parts = []
    for (let index = 0; index < count; index++) parts.push({ key: String(fields[`parts.${index}.key`]?.value || ''), text: String(fields[`parts.${index}.text`]?.value || ''), href: String(fields[`parts.${index}.href`]?.value || '') })
    return JSON.stringify(parts)
  })
  const popularPartsRef = useRef(popularParts)
  popularPartsRef.current = popularParts
  const popularCards = useRef(new Map<string, CatalogProject>())
  const seriesParts = useFormFields(([fields]) => {
    if (String(fields.key?.value || '') !== 'seriesBento') return ''
    const rows = (fields.parts as { rows?: unknown[] } | undefined)?.rows
    const count = Array.isArray(rows) ? rows.length : 0
    const parts = []
    for (let index = 0; index < count; index++) {
      const image = fields[`parts.${index}.image`]?.value
      const imageId = typeof image === 'string' ? image : image && typeof image === 'object' && 'id' in image ? String((image as { id: unknown }).id) : ''
      parts.push({ key: String(fields[`parts.${index}.key`]?.value || ''), text: String(fields[`parts.${index}.text`]?.value || ''), href: String(fields[`parts.${index}.href`]?.value || ''), image: imageId })
    }
    return JSON.stringify(parts)
  })
  const seriesPartsRef = useRef(seriesParts)
  seriesPartsRef.current = seriesParts
  const seriesCounts = useRef(new Map<string, number>())
  const seriesImages = useRef(new Map<string, string>())
  const [catalogSlug, setCatalogSlug] = useState<string | null>(null)
  const template = !project && !story && !isolateBlock && data?.route === '/catalog/[slug]'
  // A project block is previewed on the first published project page
  useEffect(() => {
    if (!catalogBlocks.has(blockKey) && !template) return
    const controller = new AbortController()
    const type = blockKey === 'ReadyHomeOffer' ? 'ready-home' : 'project'
    fetch(`/api/projects?limit=1&depth=0&sort=name&where[_status][equals]=published&where[recordType][equals]=${type}`, { credentials: 'include', signal: controller.signal }).then(response => response.ok ? response.json() : null).then(result => setCatalogSlug(result?.docs?.[0]?.slug || null)).catch(() => {})
    return () => controller.abort()
  }, [blockKey, template])
  const isolated = isolateBlock && blockKey ? { path: 'block', key: blockKey, title: blockTitle || blockKey } : null
  const isolatedRef = useRef(isolated)
  isolatedRef.current = isolated
  const { getDataByPath } = useForm()
  // Unpublished projects have no site page yet, so the preview uses an empty draft page
  const projectDraft = project && !(hasPublishedDoc && typeof data?.slug === 'string')
  const configurationFields = useFormFields(([fields]) => configuration ? fields : null)
  const nextStepsDraft = useFormFields(([fields]) => project ? normalizeNextStepsSettings({
    enabled: fields['nextStepsSettings.enabled']?.value as boolean,
    visitEnabled: fields['nextStepsSettings.visitEnabled']?.value as boolean,
    secondaryEnabled: fields['nextStepsSettings.secondaryEnabled']?.value as boolean,
    order: fields['nextStepsSettings.order']?.value as NextStepsSettings['order'],
  }) : null)
  const heroDraft = useFormFields(([fields]) => project && (projectDraft || fields.heroContentSource?.value === 'database') ? {
    slug: fields.slug?.value || '', name: fields.name?.value || '', technologyBadge: fields.technologyBadge?.value || '',
    areaValue: Number(fields.areaValue?.value) || 0, floorsValue: Number(fields.floorsValue?.value) || 0, bedrooms: Number(fields.bedrooms?.value) || 0, bathrooms: Number(fields.bathrooms?.value) || 0,
    imageUrl: fields.imageUrl?.value || '', mobileImageUrl: fields.mobileImageUrl?.value || null,
    desktopImage: fields.desktopImage?.value, mobileImage: fields.mobileImage?.value,
  } : null)
  const [deviceKey, setDeviceKey] = useState<string>('desktop')
  const [revision, setRevision] = useState(0)
  const [fit, setFit] = useState(true)
  const [available, setAvailable] = useState({ width: 0, height: 0 })
  const stage = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLElement>(null)
  const frame = useRef<HTMLIFrameElement>(null)
  const [selected, setSelected] = useState<{ path: string; key: string; title: string } | null>(null)
  const [asset, setAsset] = useState<PreviewImage | null>(null)
  const [missing, setMissing] = useState(false)
  const currentOrder = useRef<string[] | null>(null)
  const origin = new URL(siteUrl).origin
  const heroDraftRef = useRef<typeof heroDraft>(null)
  const exteriorDraftRef = useGalleryPreview('exteriors', project, frame, origin)
  const interiorDraftRef = useGalleryPreview('interiors', project, frame, origin)
  const plansDraftRef = usePlansPreview(project, frame, origin)
  const builtDraftRef = useBuiltPreview(project, frame, origin)
  const storyDraftRef = useStoryPreview(story, frame, origin)
  const nextStepsDraftRef = useRef<NextStepsSettings | null>(null)
  useEffect(() => {
    nextStepsDraftRef.current = nextStepsDraft
    if (nextStepsDraft) frame.current?.contentWindow?.postMessage({ type: 'avgst:preview-next-steps', settings: nextStepsDraft }, origin)
  }, [nextStepsDraft, origin])
  useEffect(() => {
    const controller = new AbortController()
    async function updateHero() {
      if (!heroDraft) { heroDraftRef.current = null; return }
      const mediaURL = async (value: unknown) => {
        if (!value) return null
        const media = typeof value === 'object' ? value as { url?: string } : await fetch(`/api/media/${value}?depth=0`, { signal: controller.signal }).then(response => response.ok ? response.json() : null)
        return media?.url ? new URL(media.url, window.location.origin).href : null
      }
      try {
        const [desktop, mobile] = await Promise.all([mediaURL(heroDraft.desktopImage), mediaURL(heroDraft.mobileImage)])
        if (controller.signal.aborted) return
        const resolved = { ...heroDraft, imageUrl: desktop || heroDraft.imageUrl, mobileImageUrl: mobile || heroDraft.mobileImageUrl }
        heroDraftRef.current = resolved
        frame.current?.contentWindow?.postMessage({ type: 'avgst:preview-hero', hero: resolved }, origin)
      } catch { /* A removed or unavailable file must not interrupt editing. */ }
    }
    void updateHero()
    return () => controller.abort()
  }, [heroDraft, origin])
  useEffect(() => {
    const receive = (event: Event) => {
      const order = (event as CustomEvent<string[]>).detail
      currentOrder.current = order
      frame.current?.contentWindow?.postMessage({ type: 'avgst:preview-order', order }, origin)
    }
    window.addEventListener('avgst:preview-order', receive)
    return () => window.removeEventListener('avgst:preview-order', receive)
  }, [origin])
  useEffect(() => {
    const receive = (event: Event) => {
      const detail = (event as CustomEvent).detail
      setSelected(current => detail.closed ? current?.path === detail.path ? isolatedRef.current : current : detail)
    }
    window.addEventListener('avgst:preview-selection', receive)
    return () => window.removeEventListener('avgst:preview-selection', receive)
  }, [])
  useEffect(() => {
    const receive = (event: Event) => {
      const detail = (event as CustomEvent<PreviewImage | null>).detail
      setAsset(detail?.src ? detail : null)
    }
    window.addEventListener('avgst:asset-preview', receive)
    return () => window.removeEventListener('avgst:asset-preview', receive)
  }, [])
  // The block editor opens on its own block, or on the part that is already expanded
  useEffect(() => {
    if (!isolateBlock || !blockKey) return
    const open = document.querySelector('#field-parts .array-field__row:not(.collapsible--collapsed) [data-part-key]')
    const key = open?.getAttribute('data-part-key')
    setSelected(open && key ? { path: open.getAttribute('data-row-path') || 'part', key, title: open.textContent?.trim() || key } : { path: 'block', key: blockKey, title: blockTitle || blockKey })
  }, [isolateBlock, blockKey])
  useEffect(() => {
    // Outline the section card that the preview currently isolates
    const card = !selected ? null : isolateBlock ? document.querySelector(`[data-part-key="${CSS.escape(selected.key)}"]`)?.closest('.array-field__row') ?? null : project ? document.querySelector(`.project-order-section-${selected.key}`) : document.querySelector(`[data-row-path="${selected.path}"]`)?.closest('.array-field__row') ?? null
    card?.setAttribute('data-preview-active', '')
    return () => card?.removeAttribute('data-preview-active')
  }, [project, isolateBlock, selected])
  const previewKey = isolateBlock ? blockKey || null : selected?.key ?? null
  const previewMessage = { type: 'avgst:preview-block' as const, key: previewKey, dim: Boolean(isolateBlock && previewKey) }
  useEffect(() => {
    frame.current?.contentWindow?.postMessage(previewMessage, origin)
    const receive = (event: MessageEvent) => {
      if (event.source === frame.current?.contentWindow && event.origin === origin && event.data?.type === 'avgst:preview-ready') {
        if (contentDraftRef.current.length) frame.current?.contentWindow?.postMessage({ type: 'avgst:preview-content', key: blockKey, parts: contentDraftRef.current }, origin)
        frame.current?.contentWindow?.postMessage(previewMessage, origin)
        if (currentOrder.current) frame.current?.contentWindow?.postMessage({ type: 'avgst:preview-order', order: currentOrder.current }, origin)
        if (heroDraftRef.current) frame.current?.contentWindow?.postMessage({ type: 'avgst:preview-hero', hero: heroDraftRef.current }, origin)
        if (heroPartsRef.current) frame.current?.contentWindow?.postMessage({ type: 'avgst:preview-hero-copy', parts: JSON.parse(heroPartsRef.current) }, origin)
        if (popularPartsRef.current) {
          const parts = JSON.parse(popularPartsRef.current) as { key: string; text: string; href: string }[]
          frame.current?.contentWindow?.postMessage({ type: 'avgst:preview-popular', heading: parts.find(part => part.key === 'popularProjects.heading')?.text || '', button: parts.find(part => part.key === 'popularProjects.button')?.text || '', projects: parts.filter(part => /^popularProjects\.slot\.\d+$/.test(part.key) && part.href).map(part => popularCards.current.get(part.href)).filter((item): item is CatalogProject => Boolean(item)) }, origin)
        }
        if (seriesPartsRef.current) frame.current?.contentWindow?.postMessage(seriesPreview(JSON.parse(seriesPartsRef.current), seriesCounts.current, seriesImages.current), origin)
        if (exteriorDraftRef.current) frame.current?.contentWindow?.postMessage({ type: 'avgst:preview-exteriors', images: exteriorDraftRef.current }, origin)
        if (interiorDraftRef.current) frame.current?.contentWindow?.postMessage({ type: 'avgst:preview-interiors', images: interiorDraftRef.current }, origin)
        if (plansDraftRef.current) frame.current?.contentWindow?.postMessage({ type: 'avgst:preview-plans', variants: plansDraftRef.current }, origin)
        if (builtDraftRef.current) frame.current?.contentWindow?.postMessage({ type: 'avgst:preview-built', items: builtDraftRef.current }, origin)
        if (nextStepsDraftRef.current) frame.current?.contentWindow?.postMessage({ type: 'avgst:preview-next-steps', settings: nextStepsDraftRef.current }, origin)
        if (storyDraftRef.current) {
          frame.current?.contentWindow?.postMessage({ type: 'avgst:preview-story', story: storyDraftRef.current }, origin)
          frame.current?.contentWindow?.postMessage({ type: 'avgst:preview-block', key: `StoriesEntry-${storyDraftRef.current.slug}`, dim: true }, origin)
        }
      }
      if (event.source === frame.current?.contentWindow && event.origin === origin && event.data?.type === 'avgst:preview-block-status' && event.data.key === previewKey) setMissing(!event.data.found)
    }
    window.addEventListener('message', receive)
    return () => window.removeEventListener('message', receive)
  }, [selected, previewKey, isolateBlock, origin, exteriorDraftRef, interiorDraftRef, builtDraftRef, plansDraftRef, storyDraftRef])
  useEffect(() => {
    const receive = (event: Event) => {
      const detail = (event as CustomEvent).detail as { key: string }
      if (!String(detail?.key || '').startsWith('hero.')) return
      const current = heroPartsRef.current ? JSON.parse(heroPartsRef.current) as { key: string }[] : []
      const next = current.some(part => part.key === detail.key) ? current.map(part => part.key === detail.key ? { ...part, ...detail } : part) : [...current, detail]
      heroPartsRef.current = JSON.stringify(next)
      frame.current?.contentWindow?.postMessage({ type: 'avgst:preview-hero-copy', parts: next }, origin)
    }
    window.addEventListener('avgst:part-draft', receive)
    return () => window.removeEventListener('avgst:part-draft', receive)
  }, [origin])
  useEffect(() => {
    if (blockKey !== 'popularProjects') return
    const controller = new AbortController()
    fetch('/api/projects?limit=300&depth=1&sort=name&where[_status][equals]=published', { credentials: 'include', signal: controller.signal }).then(response => response.ok ? response.json() : null).then(result => {
      const cards = new Map<string, CatalogProject>()
      for (const doc of result?.docs || []) { const card = previewCard(doc); if (card?.cmsId) cards.set(card.cmsId, card) }
      popularCards.current = cards
      if (!popularPartsRef.current) return
      const parts = JSON.parse(popularPartsRef.current) as { key: string; text: string; href: string }[]
      frame.current?.contentWindow?.postMessage({ type: 'avgst:preview-popular', heading: parts.find(part => part.key === 'popularProjects.heading')?.text || '', button: parts.find(part => part.key === 'popularProjects.button')?.text || '', projects: parts.filter(part => /^popularProjects\.slot\.\d+$/.test(part.key) && part.href).map(part => cards.get(part.href)).filter((item): item is CatalogProject => Boolean(item)) }, origin)
    }).catch(() => {})
    return () => controller.abort()
  }, [blockKey, origin])
  useEffect(() => {
    if (blockKey !== 'seriesBento') return
    const controller = new AbortController()
    fetch('/api/projects?limit=300&depth=0&where[_status][equals]=published', { credentials: 'include', signal: controller.signal }).then(response => response.ok ? response.json() : null).then(result => {
      const counts = new Map<string, number>()
      for (const doc of result?.docs || []) {
        const series = isCatalogSeries(String(doc.series || '')) ? String(doc.series) : ''
        const tech = String(doc.technologyBadge || '') === 'Модульный' ? 'modular' : 'panel'
        if (series && !isTechnologyCollection(series)) counts.set(series, (counts.get(series) || 0) + 1)
        counts.set(tech, (counts.get(tech) || 0) + 1)
      }
      seriesCounts.current = counts
      if (seriesPartsRef.current) frame.current?.contentWindow?.postMessage(seriesPreview(JSON.parse(seriesPartsRef.current), counts, seriesImages.current), origin)
    }).catch(() => {})
    return () => controller.abort()
  }, [blockKey, origin])
  useEffect(() => {
    if (!seriesParts) return
    const parts = JSON.parse(seriesParts) as { key: string; text: string; href: string; image: string }[]
    const controller = new AbortController()
    const timer = setTimeout(() => {
      const missing = [...new Set(parts.flatMap(part => part.image && !seriesImages.current.has(part.image) ? [part.image] : []))]
      Promise.all(missing.map(async id => {
        const doc = await fetch(`/api/media/${id}?depth=0`, { credentials: 'include', signal: controller.signal }).then(response => response.ok ? response.json() : null).catch(() => null)
        if (doc?.url) seriesImages.current.set(id, new URL(doc.url, window.location.origin).href)
      })).then(() => {
        if (!controller.signal.aborted) frame.current?.contentWindow?.postMessage(seriesPreview(parts, seriesCounts.current, seriesImages.current), origin)
      }).catch(() => {})
    }, 80)
    return () => { clearTimeout(timer); controller.abort() }
  }, [seriesParts, origin, revision])
  useEffect(() => {
    if (!popularParts) return
    const parts = JSON.parse(popularParts) as { key: string; text: string; href: string }[]
    const send = () => frame.current?.contentWindow?.postMessage({ type: 'avgst:preview-popular', heading: parts.find(part => part.key === 'popularProjects.heading')?.text || '', button: parts.find(part => part.key === 'popularProjects.button')?.text || '', projects: parts.filter(part => /^popularProjects\.slot\.\d+$/.test(part.key) && part.href).map(part => popularCards.current.get(part.href)).filter((item): item is CatalogProject => Boolean(item)) }, origin)
    const timer = setTimeout(send, 80)
    return () => clearTimeout(timer)
  }, [popularParts, origin, revision])
  useEffect(() => {
    if (!heroParts) return
    const send = () => frame.current?.contentWindow?.postMessage({ type: 'avgst:preview-hero-copy', parts: JSON.parse(heroParts) }, origin)
    const timer = setTimeout(send, 80)
    return () => clearTimeout(timer)
  }, [heroParts, origin, revision])
  const blockRoute = contentScope || (homeBlocks.has(blockKey) ? '/' : catalogBlocks.has(blockKey) && catalogSlug ? `/catalog/${catalogSlug}` : null)
  const route = configuration ? '/cms-preview/configurations' : story ? '/stories' : isolateBlock ? blockRoute : project ? (projectDraft ? '/catalog/__draft' : `/catalog/${data?.slug}`) : template ? catalogSlug ? `/catalog/${catalogSlug}` : null : typeof data?.route === 'string' ? data.route : null
  const validRoute = Boolean(route && !route.includes('['))
  useEffect(() => {
    if (!configuration) return
    const send = () => frame.current?.contentWindow?.postMessage({ type: 'avgst:preview-configurations', templates: getDataByPath<ConfigurationTemplatesData>('configurationTemplates'), ...configuration }, origin)
    const timer = setTimeout(send, 80)
    const receive = (event: MessageEvent) => { if (event.origin === origin && event.source === frame.current?.contentWindow && event.data?.type === 'avgst:configurations-ready') send() }
    window.addEventListener('message', receive)
    return () => { clearTimeout(timer); window.removeEventListener('message', receive) }
  }, [configuration, configurationFields, getDataByPath, origin, available.width, revision])
  useEffect(() => {
    const element = stage.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setAvailable({ width: entry.contentRect.width, height: entry.contentRect.height }))
    observer.observe(element)
    return () => observer.disconnect()
  }, [validRoute])
  if (!validRoute) return <Empty className="h-full min-h-96 rounded-xl border bg-card shadow-xs">
    <EmptyHeader>
      <EmptyMedia variant="icon"><IconBrowser /></EmptyMedia>
      <EmptyTitle>Здесь появится превью</EmptyTitle>    </EmptyHeader>
  </Empty>
  const device = devices.find(item => item.key === deviceKey) ?? devices[0]
  const scale = fit ? Math.min(1, available.width / device.width, available.height / device.height) : 1
  const url = `${siteUrl}${route}`
  const frameURL = `${url}${url.includes('?') ? '&' : '?'}cmsPreview=1`
  return <section ref={panel} className="shadcn-surface page-preview" aria-label={asset ? 'Просмотр файла' : configuration ? 'Предпросмотр комплектаций' : story ? 'Превью отзыва' : 'Превью страницы'}>
    <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
      <div className="min-w-0"><h2 className="truncate text-sm font-medium">{asset ? asset.title : configuration ? 'Комплектации' : story ? 'Отзыв' : isolateBlock ? blockTitle || 'Блок' : selected ? selected.title : 'Превью страницы'}</h2><p className="mt-1 text-xs text-muted-foreground">{asset ? 'Загруженный файл' : configuration ? 'Изменения видны до сохранения' : story ? 'Только карточка истории' : isolateBlock ? 'Только этот блок' : selected ? 'Блок отдельно' : 'Текущая версия сайта'}</p></div>
      {asset ? <Button type="button" size="sm" variant="outline" onClick={() => setAsset(null)}>Закрыть</Button> : <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Устройство">
        {devices.map(item => <Button key={item.key} type="button" size="icon" variant={item.key === device.key ? 'secondary' : 'ghost'} title={item.label} aria-label={item.label} aria-pressed={item.key === device.key} onClick={() => setDeviceKey(item.key)}><item.icon className={`size-4 ${item.key === 'tablet-landscape' ? 'rotate-90' : ''}`} /></Button>)}
        <Button type="button" size="icon" variant="ghost" title="Обновить превью" aria-label="Обновить превью" onClick={() => setRevision(value => value + 1)}><IconRefresh className="size-4" /></Button>
        <Button type="button" size="icon" variant="ghost" title="Развернуть превью" aria-label="Развернуть превью" onClick={() => { if (document.fullscreenElement) void document.exitFullscreen(); else void panel.current?.requestFullscreen() }}><IconMaximize className="size-4" /></Button>
        {!configuration && <Button size="icon" variant="ghost" asChild><a href={url} target="_blank" rel="noreferrer" title="Открыть страницу сайта" aria-label="Открыть страницу сайта"><IconExternalLink className="size-4" /></a></Button>}
      </div>}
    </div>
    {!asset && <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2 text-xs">
      <span className="text-muted-foreground">{device.label} · {device.width} × {device.height} px</span>
      {!isolateBlock && selected && <Button type="button" size="sm" variant="ghost" onClick={() => setSelected(null)}>Вся страница</Button>}
      <Button type="button" size="sm" variant="ghost" aria-label="Переключить масштаб превью" onClick={() => setFit(value => !value)}>{fit ? `Вписать · ${Math.round(scale * 100)}%` : '100%'}</Button>
    </div>}
    <div ref={stage} className={asset ? 'page-preview__stage page-preview__stage--file' : 'page-preview__stage'}>
      {asset?.embed ? <iframe src={asset.src} title={asset.title} allow="autoplay; fullscreen; picture-in-picture; encrypted-media" /> : asset ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={asset.src} alt={asset.title} /> : null}
      {available.width > 0 && <div className="page-preview__screen" hidden={Boolean(asset)} style={{ width: device.width * scale, height: device.height * scale }}>
        {missing && selected && !isolateBlock && <p className="absolute inset-0 z-10 flex items-center justify-center bg-card p-6 text-sm">Этот компонент ещё не подключён к изолированному превью.</p>}
        <iframe ref={frame} onLoad={() => {
          if (configuration) {
            frame.current?.contentWindow?.postMessage({ type: 'avgst:preview-configurations', templates: getDataByPath<ConfigurationTemplatesData>('configurationTemplates'), ...configuration }, origin)
            return
          }
          if (story && storyDraftRef.current) {
            frame.current?.contentWindow?.postMessage({ type: 'avgst:preview-story', story: storyDraftRef.current }, origin)
            frame.current?.contentWindow?.postMessage({ type: 'avgst:preview-block', key: `StoriesEntry-${storyDraftRef.current.slug}`, dim: true }, origin)
            return
          }
          frame.current?.contentWindow?.postMessage(previewMessage, origin)
        }} key={`${url}:${revision}`} title={`Превью ${route}: ${device.label}`} src={frameURL} style={{ position: 'absolute', top: 0, left: 0, width: device.width, height: device.height, transform: `scale(${scale})`, transformOrigin: 'top left', maxWidth: 'none', border: 0, display: 'block', background: '#fff' }} />
      </div>}
    </div>
  </section>
}
