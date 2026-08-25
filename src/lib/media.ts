type MediaLike = { url?: string | null } | number | string | null | undefined

export function mediaUrl(media: MediaLike): string {
  if (media && typeof media === 'object' && 'url' in media && media.url) return media.url
  return ''
}

export function splitHeadline(text: string): [string, string] {
  const normalized = text.trim().replace(/\s+/g, ' ')
  const lower = normalized.toLowerCase()
  const marker = ' \u0434\u043e\u043c\u0430 '
  const idx = lower.indexOf(marker)
  if (idx > 0) {
    const cut = idx + marker.length - 1
    return [normalized.slice(0, cut), normalized.slice(cut).trim()]
  }
  const words = normalized.split(' ')
  if (words.length < 4) return [normalized, '']
  const mid = Math.ceil(words.length * 0.45)
  return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')]
}

export function splitProjectName(name: string): { text: string; digits: string } {
  const match = name.match(/^(.*?)(\d[\d\s-]*)$/)
  if (!match) return { text: name, digits: '' }
  return { text: match[1].trim(), digits: match[2].trim() }
}
