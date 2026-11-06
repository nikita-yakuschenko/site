import webpAssets from '../data/webp-assets.json'

type MediaLike = { url?: string | null } | number | string | null | undefined

export function mediaUrl(media: MediaLike): string {
  if (media && typeof media === 'object' && 'url' in media && media.url) return media.url
  return ''
}

const imageWidths = [32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1280, 1920, 2048, 2560, 3840]
const imageQualities = [45, 60, 75, 80, 85, 90, 100]

function isCMSPhoto(src: string): boolean {
  try {
    const url = new URL(src)
    return url.origin === 'https://cms.avgst.ru' && url.pathname.startsWith('/api/media/file/') && /\.(?:jpe?g|png|webp|avif)$/i.test(url.pathname)
  } catch { return false }
}

function nearestWidth(width: number): number {
  return imageWidths.find(value => value >= width) ?? imageWidths[imageWidths.length - 1]
}

function nearestQuality(quality: number): number {
  return imageQualities.reduce((best, value) => Math.abs(value - quality) < Math.abs(best - quality) ? value : best)
}

function storedSource(src: string): string {
  if (!src.startsWith('/')) return src
  const [pathname] = src.split(/[?#]/)
  try { return (webpAssets as Record<string, string>)[decodeURIComponent(pathname || '')] || src }
  catch { return src }
}

// Width asks the image optimizer for that slot. The stored WebP stays the source.
export function resizedSrc(src: string, width: number, quality = 75): string {
  const size = nearestWidth(width)
  const q = nearestQuality(quality)
  return `/_next/image?url=${encodeURIComponent(storedSource(src))}&w=${size}&q=${q}`
}

export function resizedSrcSet(src: string, widths: number[], quality = 75): string {
  const seen = new Set<number>()
  return widths.flatMap(width => {
    const size = nearestWidth(width)
    if (seen.has(size)) return []
    seen.add(size)
    return [`${resizedSrc(src, size, quality)} ${size}w`]
  }).join(', ')
}

// Local assets stay pre-encoded; CMS originals need cached responsive versions.
export function optimizedSrc(src: string, width?: number, quality = 75): string {
  if (isCMSPhoto(src) && width) return resizedSrc(src, width, quality)
  if (!src || !src.startsWith('/')) return src
  if (src.startsWith('/_next/image?')) {
    const original = new URLSearchParams(src.split('?')[1]).get('url')
    return original && !original.startsWith('/_next/image') ? optimizedSrc(original, width, quality) : src
  }
  const [pathname] = src.split(/[?#]/)
  try { return (webpAssets as Record<string, string>)[decodeURIComponent(pathname || '')] || src }
  catch { return src }
}

export function optimizedSrcSet(src: string, widths: number[], quality?: number): string {
  if (isCMSPhoto(src)) return resizedSrcSet(src, widths, quality)
  return optimizedSrc(src)
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
  return { text: (match[1] ?? '').trim(), digits: (match[2] ?? '').trim() }
}
