export type BuiltVideo = { provider: 'kinescope'; id: string } | { provider: 'vk'; oid: number; id: string }
export type BuiltItem = { type: 'photo'; image: string; caption?: string } | { type: 'video'; video: BuiltVideo; cover?: string; caption?: string }
export type BuiltRow = { type?: string | null; photo?: unknown; image?: string | null; caption?: string | null; provider?: string | null; videoUrl?: string | null; isPrimary?: boolean | null }

// Accept public platform links only; never render arbitrary iframe URLs.
export function parseBuiltVideo(provider: unknown, value: unknown): BuiltVideo | null {
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value.trim())
    if (url.protocol !== 'https:' || url.username || url.password) return null
    if (provider === 'kinescope' && url.hostname === 'kinescope.io') {
      const match = url.pathname.match(/^\/(?:embed\/)?([a-zA-Z0-9-]+)\/?$/)
      if (match) return { provider, id: match[1] }
    }
    if (provider === 'vk' && ['vk.com', 'www.vk.com', 'vkvideo.ru', 'www.vkvideo.ru'].includes(url.hostname)) {
      const match = url.pathname.match(/^\/video(-?\d+)_(\d+)\/?$/)
      const oid = match?.[1] ?? (url.pathname === '/video_ext.php' ? url.searchParams.get('oid') : null)
      const id = match?.[2] ?? (url.pathname === '/video_ext.php' ? url.searchParams.get('id') : null)
      if (oid && /^-?\d+$/.test(oid) && Number.isSafeInteger(Number(oid)) && id && /^\d+$/.test(id)) return { provider, oid: Number(oid), id }
    }
  } catch { /* Invalid links are reported by field validation. */ }
  return null
}

export async function resolveBuiltItems(rows: BuiltRow[], mediaURL: (value: unknown) => Promise<string | null>): Promise<BuiltItem[]> {
  const primary = rows.find(row => row.isPrimary) || rows[0]
  const ordered = primary ? [primary, ...rows.filter(row => row !== primary)] : rows
  const items = await Promise.all(ordered.map(async row => {
    const image = row.photo ? await mediaURL(row.photo) : row.image || null
    const caption = row.caption || undefined
    if (row.type === 'video') {
      const video = parseBuiltVideo(row.provider, row.videoUrl)
      return video ? { type: 'video' as const, video, cover: image || undefined, caption } : null
    }
    return image ? { type: 'photo' as const, image, caption } : null
  }))
  return items.filter((item): item is NonNullable<typeof item> => item !== null)
}
