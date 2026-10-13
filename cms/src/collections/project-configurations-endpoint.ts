import type { Endpoint } from 'payload'
import { authorizeSiteRequest } from './project-hero-endpoint'
import { configurationTiers } from '../../../src/lib/catalog/project-configurations-data'
import { sharedConfigurationContent } from '../../../src/lib/catalog/configuration-content'

export const projectConfigurationsEndpoint: Endpoint = {
  path: '/configurations', method: 'get', handler: async req => {
    const denied = authorizeSiteRequest(req)
    if (denied) return denied
    const slug = new URL(req.url!).searchParams.get('slug')
    if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return Response.json({ error: 'Некорректный адрес' }, { status: 400 })
    const result = await req.payload.find({ collection: 'projects', limit: 1, depth: 0, req, overrideAccess: true,
      where: { or: [{ slug: { equals: slug } }, { importKey: { equals: `catalog:${slug}` } }] }, select: { configurations: true, technologyBadge: true } })
    const record = result.docs[0]
    if (!record || !configurationTiers(record.configurations || [], record.technologyBadge)) return Response.json({ error: 'Комплектации не настроены' }, { status: 404 })
    const prices = await req.payload.find({ collection: 'project-prices', where: { project: { equals: record.id } }, pagination: false, depth: 0, req, overrideAccess: true })
    const configurations = (record.configurations || []).map(row => ({ key: row.key, price: row.price, regionalPrices: Object.fromEntries(prices.docs.filter(price => price.configuration === row.key).map(price => [price.region, price.price])) }))
    // Legacy project prices belong only to NN; never substitute them for another region.
    for (const row of configurations) if (!('nn' in row.regionalPrices) && row.price > 0) row.regionalPrices.nn = row.price
    const blocks = await req.payload.find({ collection: 'blocks', where: { key: { equals: 'ProjectConfig' } }, limit: 1, depth: 0, req, overrideAccess: true })
    return Response.json({ configurations, technologyBadge: record.technologyBadge, sharedContent: sharedConfigurationContent(blocks.docs[0]?.configurationTemplates || {}, record.technologyBadge) }, { headers: { 'Cache-Control': 'no-store' } })
  },
}
