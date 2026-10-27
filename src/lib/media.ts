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

// Local assets stay pre-encoded; CMS originals need cached responsive versions.
export function optimizedSrc(src: string, width?: number, quality = 75): string {
  if (isCMSPhoto(src) && width) {
    const size = imageWidths.find(value => value >= width) ?? imageWidths[imageWidths.length - 1]
    const q = imageQualities.reduce((best, value) => Math.abs(value - quality) < Math.abs(best - quality) ? value : best)
    return `/_next/image?url=${encodeURIComponent(src)}&w=${size}&q=${q}`
  }
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
  if (isCMSPhoto(src)) return [...new Set(widths)].map(width => `${optimizedSrc(src, width, quality)} ${imageWidths.find(value => value >= width) ?? 3840}w`).join(', ')
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
