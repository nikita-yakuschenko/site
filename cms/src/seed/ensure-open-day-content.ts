import type { Payload } from 'payload'
import { openDayContent } from '../../../src/lib/open-day/content'

export async function ensureOpenDayContent(payload: Payload) {
  const page = (await payload.find({ collection: 'pages', where: { route: { equals: '/factory-open-day' } }, limit: 1, depth: 0, overrideAccess: true })).docs[0]
  const blocks = (await payload.find({
    collection: 'blocks',
    where: { key: { in: Object.keys(openDayContent).flatMap(key => page ? [key, `${key}-page-${page.id}`] : [key]) } },
    pagination: false, depth: 0, overrideAccess: true,
  })).docs
  for (const block of blocks) {
    const component = block.key?.split('-page-')[0]
    const fields = Object.entries(openDayContent).find(([key]) => key === component)?.[1]
    if (!fields) continue
    const current = block.parts || []
    const present = new Set(current.map(part => part.key))
    const missing = fields.filter(field => !present.has(field.key))
    const defaults = (block.defaults || {}) as Record<string, unknown>
    if (!missing.length && defaults.contentBinding === 'react' && defaults.contentScope === '/factory-open-day') continue
    await payload.update({
      collection: 'blocks', id: block.id, overrideAccess: true,
      data: {
        defaults: { ...defaults, contentBinding: 'react', contentScope: '/factory-open-day' },
        parts: [...current, ...missing.map(({ key, title, text, image }) => ({ key, title: title || key, text, textMore: image }))],
      },
    })
  }
}
