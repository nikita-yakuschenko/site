import type { Endpoint } from 'payload'
import { catalogPrice } from '../config/catalog-price'
import { authorizeSiteRequest } from './project-hero-endpoint'
import { isModularTechnology } from '../../../src/lib/catalog/configuration-rules'
import type { CatalogProject } from '../../../src/lib/catalog/types'
import { isPublicPriceKind } from '../config/price-kinds'

export const projectCatalogEndpoint: Endpoint = {
  path: '/catalog', method: 'get', handler: async req => {
    const denied = authorizeSiteRequest(req)
    if (denied) return denied
    const slug = new URL(req.url!).searchParams.get('slug')
    if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return Response.json({ error: 'Некорректный адрес' }, { status: 400 })
    const projects = await req.payload.find({ collection: 'projects', pagination: false, sort: 'name', depth: 1, req, overrideAccess: true, where: { and: [{ _status: { equals: 'published' } }, ...(slug ? [{ or: [{ slug: { equals: slug } }, { importKey: { equals: `catalog:${slug}` } }] }] : [])] } })
    const prices = await req.payload.find({ collection: 'project-prices', pagination: false, depth: 0, req, overrideAccess: true })
    const mediaURL = (photo: unknown, fallback?: string | null): string => {
      const url = typeof photo === 'object' && photo && 'url' in photo && typeof photo.url === 'string' ? photo.url : fallback
      return url ? new URL(url, process.env.CMS_PUBLIC_URL).href : ''
    }
    // Кадр может быть ещё не загружен. Такой проект остаётся в каталоге:
    // иначе его адрес открывается страницей 404.
    const items: CatalogProject[] = projects.docs.map(record => {
      const modular = isModularTechnology(record.technologyBadge)
      const projectId = (project: number | { id: number }) => typeof project === 'number' ? project : project.id
      const importedPrice = prices.docs.find(row => projectId(row.project) === record.id && row.configuration === 'standard' && row.region === 'nn')?.price
      const price = catalogPrice(record, importedPrice)
      const regionalPrices = Object.fromEntries(prices.docs.filter(row => projectId(row.project) === record.id && row.configuration === 'standard' && isPublicPriceKind(row.region)).map(row => [row.region, row.price]))
      if (!('nn' in regionalPrices) && price && price > 0) regionalPrices.nn = price
      return {
        id: record.importKey?.replace(/^catalog:/, '') || `cms:${record.id}`, cmsId: record.code || undefined, slug: record.slug, name: record.name, href: `/catalog/${record.slug}`,
        area: String(record.areaValue), areaValue: record.areaValue, floors: String(record.floorsValue), floorsValue: record.floorsValue, bedrooms: String(record.bedrooms), bathrooms: String(record.bathrooms),
        technology: modular ? 'modular' : 'panel', technologyBadge: record.technologyBadge, series: record.series || (modular ? 'modular' : 'panel'),
        imageUrl: mediaURL(record.desktopImage, record.imageUrl), mobileImageUrl: mediaURL(record.mobileImage, record.mobileImageUrl) || null,
        priceAmount: price && price > 0 ? price : null, priceLabel: price && price > 0 ? `от ${price.toLocaleString('ru-RU')} руб.` : 'Цена уточняется', regionalPrices,
        description: record.searchDescription?.trim() || record.name,
        exteriors: (record.exteriors || []).map(row => mediaURL(row.photo, row.image)).filter(Boolean), interiors: (record.interiors || []).map(row => mediaURL(row.photo, row.image)).filter(Boolean), floorPlans: [],
        about: (record.about || []).map(row => ({ title: row.title, text: row.text, image: row.image || undefined })), options: [],
        ...(record.recordType === 'ready-home' && record.readyHome ? { readyHome: { location: record.readyHome.location || '', locationPrepositional: record.readyHome.locationPrepositional || undefined, salePrice: record.readyHome.salePrice || 0, configurationLead: record.readyHome.configurationLead || '', configuration: record.readyHome.configuration?.map(row => row.text), visitImage: record.readyHome.visitImage || undefined } } : {}),
      }
    })
    return Response.json({ items }, { headers: { 'Cache-Control': 'no-store' } })
  },
}
