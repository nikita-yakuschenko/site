import type { Endpoint } from 'payload'
import { authorizeSiteRequest } from './project-hero-endpoint'

const seriesTitle: Record<string, string> = {
  panel: 'Панельно-каркасные дома',
  barn: 'Барнхаусы',
  classic: 'Классика',
  modular: 'Модульные дома',
  aframe: 'А-фрейм',
}

function meters(value: unknown): number | null {
  const number = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : Number.NaN
  return Number.isFinite(number) && number > 0 ? number : null
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/** Габариты, документы и логистика для кабинета партнёра. На публичную карточку не отдаётся. */
export const projectPartnerCabinetEndpoint: Endpoint = {
  path: '/partner-cabinet', method: 'get', handler: async req => {
    const denied = authorizeSiteRequest(req)
    if (denied) return denied
    const slug = new URL(req.url!).searchParams.get('slug')
    if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return Response.json({ error: 'Некорректный адрес' }, { status: 400 })
    const result = await req.payload.find({ collection: 'projects', limit: 1, depth: 0, req, overrideAccess: true,
      where: { and: [{ _status: { equals: 'published' } }, { recordType: { equals: 'project' } }, { or: [{ slug: { equals: slug } }, { importKey: { equals: `catalog:${slug}` } }] }] },
      select: { slug: true, code: true, series: true, technologyBadge: true, partnerCabinet: true } })
    const record = result.docs[0]
    if (!record) return Response.json({ error: 'Проект не найден' }, { status: 404 })
    const cabinet = record.partnerCabinet
    const lengthM = meters(cabinet?.lengthM)
    const widthM = meters(cabinet?.widthM)
    const dimensionsLabel = lengthM && widthM
      ? `${String(lengthM).replace('.', ',')}×${String(widthM).replace('.', ',')} м`
      : null
    const prices = await req.payload.find({ collection: 'project-prices', limit: 1, depth: 0, req, overrideAccess: true,
      where: { and: [{ project: { equals: record.id } }, { region: { equals: 'dealer' } }, { configuration: { equals: 'start' } }] } })
    const dealerPrice = prices.docs[0]?.price
    const document = (kind: string, title: string, url: unknown, note: unknown) => ({ kind, title, url: text(url), note: text(note) })
    return Response.json({
      slug: record.slug,
      code: record.code || null,
      series: record.series || null,
      seriesLabel: record.series ? seriesTitle[record.series] || null : null,
      technologyBadge: record.technologyBadge,
      dimensions: { lengthM, widthM, label: dimensionsLabel },
      documents: [
        document('passport', 'Паспорт проекта', cabinet?.passportUrl, cabinet?.passportNote),
        document('spec', 'Спецификация комплектации', cabinet?.specUrl, cabinet?.specNote),
        document('plan', 'Планировочное решение', cabinet?.planUrl, cabinet?.planNote),
        document('manual', 'Инструкция по монтажу', cabinet?.manualUrl, cabinet?.manualNote),
      ],
      cargo: {
        modulesNote: text(cabinet?.cargoModules),
        dimensionsNote: text(cabinet?.cargoDimensions),
        weightNote: text(cabinet?.cargoWeight),
        packingNote: text(cabinet?.cargoPacking),
      },
      transport: {
        method: text(cabinet?.transportMethod),
        leadTimeNote: text(cabinet?.transportLead),
        deliveryNote: text(cabinet?.transportDelivery),
        unloadingNote: text(cabinet?.transportUnloading),
        mountingNote: text(cabinet?.transportMounting),
      },
      dealerPrice: typeof dealerPrice === 'number' && dealerPrice > 0 ? dealerPrice : null,
    }, { headers: { 'Cache-Control': 'no-store' } })
  },
}
