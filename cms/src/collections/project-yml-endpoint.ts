import type { Endpoint, PayloadRequest } from 'payload'
import { equalSecret } from '../automation/crypto'
import { authenticated } from '../access/staff'
import { catalogYml } from '../config/catalog-yml'
import { catalogVkYml } from '../config/catalog-vk-yml'
import { isPriceKind, priceKindsInForm, summaryConfiguration, type PriceKind } from '../config/price-kinds'

const feedToken = () => process.env.CMS_YML_FEED_TOKEN?.trim() || ''
export type YmlFeedChannel = 'direct' | 'vk'

const publishedProjects = (req: PayloadRequest, overrideAccess: boolean, depth: number) => req.payload.find({
  collection: 'projects', draft: false, pagination: false, depth, sort: 'id', req, overrideAccess,
  where: { _status: { equals: 'published' } },
})

async function buildCatalogYml(req: PayloadRequest, priceKind: PriceKind, overrideAccess: boolean, channel: YmlFeedChannel) {
  const depth = channel === 'vk' ? 2 : 1
  const projects = await publishedProjects(req, overrideAccess, depth)
  const prices = await req.payload.find({
    collection: 'project-prices', pagination: false, depth: 0, req, overrideAccess,
    where: { and: [{ region: { equals: priceKind } }, { configuration: { equals: summaryConfiguration(priceKind) } }] },
  })
  if (channel === 'vk') return catalogVkYml(projects.docs, prices.docs, new Date(), process.env.CMS_PUBLIC_URL, priceKind)
  return catalogYml(projects.docs, prices.docs, new Date(), process.env.CMS_PUBLIC_URL, priceKind)
}

export function ymlFeedUrl(priceKind: PriceKind, channel: YmlFeedChannel = 'direct') {
  const token = feedToken()
  if (!token) return null
  if (channel === 'vk' && priceKind !== 'nn' && priceKind !== 'msk') return null
  const origin = (process.env.CMS_PUBLIC_URL || 'https://cms.avgst.ru').replace(/\/$/, '')
  const url = new URL(`${origin}/api/projects/yml`)
  url.searchParams.set('kind', priceKind)
  if (channel === 'vk') url.searchParams.set('channel', 'vk')
  url.searchParams.set('token', token)
  return url.href
}

function xmlResponse(result: { xml: string; count: number; skipped: number }, attachment?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/xml; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Export-Count': String(result.count),
    'X-Export-Skipped': String(result.skipped),
  }
  if (attachment) headers['Content-Disposition'] = `attachment; filename="${attachment}"`
  return new Response(result.xml, { headers })
}

export const projectYmlOptionsEndpoint: Endpoint = {
  path: '/export-yml/options', method: 'get', handler: async req => {
    try {
      if (!await authenticated({ req })) return Response.json({ error: 'Нет доступа к выгрузке каталога' }, { status: 403 })
      const [projects, prices] = await Promise.all([
        publishedProjects(req, false, 1),
        req.payload.find({ collection: 'project-prices', pagination: false, depth: 0, req, overrideAccess: false }),
      ])
      const options = priceKindsInForm.map(kind => ({
        value: kind.value,
        label: kind.label,
        count: catalogYml(projects.docs, prices.docs, new Date(), process.env.CMS_PUBLIC_URL, kind.value).count,
        feedUrl: ymlFeedUrl(kind.value, 'direct'),
        vkFeedUrl: ymlFeedUrl(kind.value, 'vk'),
      })).filter(kind => kind.count > 0)
      return Response.json({ options }, { headers: { 'Cache-Control': 'no-store' } })
    } catch (error) {
      req.payload.logger.error({ err: error, msg: 'Catalog YML price options failed' })
      return Response.json({ error: 'Не удалось получить доступные типы цен. Попробуйте ещё раз.' }, { status: 500 })
    }
  },
}

export const projectYmlEndpoint: Endpoint = {
  path: '/export-yml', method: 'post', handler: async req => {
    try {
      if (!await authenticated({ req })) return Response.json({ error: 'Нет доступа к выгрузке каталога' }, { status: 403 })
      const body = await req.json?.().catch(() => null)
      const priceKind = body?.priceKind ?? 'nn'
      if (!isPriceKind(priceKind)) return Response.json({ error: 'Неизвестный тип цены' }, { status: 400 })
      const result = await buildCatalogYml(req, priceKind, false, 'direct')
      if (!result.count) return Response.json({ error: 'Нет опубликованных проектов с корректной ценой, технологией и изображением' }, { status: 422 })
      const filename = priceKind === 'nn' ? 'avgst-catalog.yml' : `avgst-catalog-${priceKind}.yml`
      return xmlResponse(result, filename)
    } catch (error) {
      req.payload.logger.error({ err: error, msg: 'Catalog YML export failed' })
      return Response.json({ error: 'Не удалось сформировать YML. Попробуйте ещё раз.' }, { status: 500 })
    }
  },
}

export const projectYmlFeedEndpoint: Endpoint = {
  path: '/yml', method: 'get', handler: async req => {
    try {
      const expected = feedToken()
      const url = new URL(req.url || 'http://localhost')
      const token = url.searchParams.get('token') || ''
      if (!expected || !equalSecret(token, expected)) return Response.json({ error: 'Нет доступа' }, { status: 401 })
      const priceKind = url.searchParams.get('kind') || 'nn'
      if (!isPriceKind(priceKind)) return Response.json({ error: 'Неизвестный тип цены' }, { status: 400 })
      const channelParam = url.searchParams.get('channel') || 'direct'
      if (channelParam !== 'direct' && channelParam !== 'vk') return Response.json({ error: 'Неизвестный канал фида' }, { status: 400 })
      const channel: YmlFeedChannel = channelParam
      if (channel === 'vk' && priceKind !== 'nn' && priceKind !== 'msk') return Response.json({ error: 'Фид ВКонтакте только для НН и МСК' }, { status: 400 })
      const result = await buildCatalogYml(req, priceKind, true, channel)
      if (!result.count) return Response.json({ error: 'Нет опубликованных проектов с корректной ценой, технологией и изображением' }, { status: 422 })
      return xmlResponse(result)
    } catch (error) {
      req.payload.logger.error({ err: error, msg: 'Catalog YML feed failed' })
      return Response.json({ error: 'Не удалось сформировать YML. Попробуйте ещё раз.' }, { status: 500 })
    }
  },
}
