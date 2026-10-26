import type { Field } from 'payload'

// Copy schema-owned content, not DB identities. JSON values are opaque: an `id`
// inside JSON is content, whereas array-row IDs must be issued for the new rows.
export function copyProjectFields(fields: Field[], source: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const field of fields) {
    if (field.type === 'ui') continue
    if (field.type === 'tabs') {
      for (const tab of field.tabs) {
        if ('name' in tab && tab.name) {
          const value = source[tab.name]
          if (value && typeof value === 'object') result[tab.name] = copyProjectFields(tab.fields, value as Record<string, unknown>)
        } else Object.assign(result, copyProjectFields(tab.fields, source))
      }
      continue
    }
    if (!('name' in field) || !field.name) {
      if ('fields' in field) Object.assign(result, copyProjectFields(field.fields, source))
      continue
    }
    if (field.name === 'id') continue
    const value = source[field.name]
    if (value === undefined) continue
    if (field.type === 'group' && value && typeof value === 'object') result[field.name] = copyProjectFields(field.fields, value as Record<string, unknown>)
    else if (field.type === 'array' && Array.isArray(value)) result[field.name] = value.map(row => copyProjectFields(field.fields, row))
    else result[field.name] = structuredClone(value)
  }
  return result
}

export function projectCopyData(fields: Field[], source: Record<string, unknown>, slug: string): Record<string, unknown> {
  const data = copyProjectFields(fields, source)
  for (const key of ['unpublishedAt', 'id', 'code', 'createdAt', 'updatedAt', 'importKey', 'hero_product', 'likeCount', 'shareCount', 'viewCount', 'likeVoters', 'shareVoters']) delete data[key]
  return { ...data, slug, _status: 'draft' as const, importKey: null, hero_product: null, likeCount: 0, shareCount: 0, viewCount: 0, likeVoters: [], shareVoters: [] }
}
