import type { Payload } from 'payload'

function relationId(value: unknown) {
  if (typeof value === 'number') return value
  if (value && typeof value === 'object' && 'id' in value && typeof value.id === 'number') return value.id
  return null
}

/** Блок «Персона» страницы производства: фото, имя и подпись. Пустые поля на сайте не показываются. */
export async function ensureManufacturePerson(payload: Payload) {
  const page = (await payload.find({ collection: 'pages', where: { route: { equals: '/manufacture' } }, limit: 1, depth: 0, overrideAccess: true })).docs[0]
  if (!page) return
  const key = `Person-page-${page.id}`
  const partKey = `${key}.content.person`
  const existing = (await payload.find({ collection: 'blocks', where: { key: { equals: key } }, limit: 1, depth: 0, overrideAccess: true })).docs[0]
  const defaults = { ...((existing?.defaults as Record<string, unknown> | null) || {}), contentScope: '/manufacture', contentBinding: 'react', contentKeys: [partKey] }
  const hasPart = (existing?.parts || []).some(part => part.key === partKey)
  const block = !existing
    ? await payload.create({ collection: 'blocks', overrideAccess: true, data: { key, title: 'Персона', source: 'src/components/person-card.tsx', exportName: 'PersonCard', defaults, parts: [{ key: partKey, title: 'Персона', text: '', textMore: '' }] } })
    : hasPart
      ? existing
      : await payload.update({ collection: 'blocks', id: existing.id, overrideAccess: true, data: { defaults, parts: [...(existing.parts || []), { key: partKey, title: 'Персона', text: '', textMore: '' }] } })

  const layout = [...(page.layout || [])]
  const linked = layout.some(row => row.component?.relationTo === 'blocks' && relationId(row.component.value) === block.id)
  if (linked) return
  const video = (await payload.find({ collection: 'blocks', where: { key: { equals: `ManufactureVideoReview-page-${page.id}` } }, limit: 1, depth: 0, overrideAccess: true })).docs[0]
  const videoAt = video ? layout.findIndex(row => row.component?.relationTo === 'blocks' && relationId(row.component.value) === video.id) : -1
  layout.splice(videoAt >= 0 ? videoAt + 1 : layout.length, 0, { component: { relationTo: 'blocks', value: block.id } })
  await payload.update({ collection: 'pages', id: page.id, overrideAccess: true, data: { layout } })
}
