import { detectBuiltVideo, type BuiltVideo } from './built-media'

export type VideoMeta = { duration: string; poster: string }

export function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return ''
  const total = Math.round(seconds)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  return `${minutes}:${String(secs).padStart(2, '0')}`
}

function metaFromHtml(html: string): VideoMeta | null {
  const durationRaw = html.match(/property=["']og:video:duration["']\s+content=["'](\d+(?:\.\d+)?)["']/i)?.[1]
    || html.match(/content=["'](\d+(?:\.\d+)?)["']\s+property=["']og:video:duration["']/i)?.[1]
    || html.match(/"duration"\s*:\s*(\d+(?:\.\d+)?)/)?.[1]
  const poster = html.match(/property=["']og:image["']\s+content=["']([^"']+)["']/i)?.[1]
    || html.match(/content=["']([^"']+)["']\s+property=["']og:image["']/i)?.[1]
    || html.match(/property=["']twitter:image["']\s+content=["']([^"']+)["']/i)?.[1]
    || ''
  const duration = durationRaw ? formatDuration(Number(durationRaw)) : ''
  if (!duration && !poster) return null
  return { duration, poster }
}

async function fetchText(url: string, signal?: AbortSignal) {
  const response = await fetch(url, {
    signal,
    headers: { Accept: 'text/html,application/json', 'User-Agent': 'avgst-cms/1.0' },
    redirect: 'follow',
  })
  if (!response.ok) return null
  return response.text()
}

export async function fetchVideoMeta(video: BuiltVideo, signal?: AbortSignal): Promise<VideoMeta | null> {
  try {
    if (video.provider === 'kinescope') {
      const oembed = await fetch(`https://kinescope.io/oembed?url=${encodeURIComponent(`https://kinescope.io/${video.id}`)}&format=json`, { signal, headers: { Accept: 'application/json' } }).then(response => response.ok ? response.json() : null).catch(() => null)
      const page = await fetchText(`https://kinescope.io/${video.id}`, signal)
      const fromPage = page ? metaFromHtml(page) : null
      const poster = typeof oembed?.thumbnail_url === 'string' ? oembed.thumbnail_url : fromPage?.poster || ''
      const duration = fromPage?.duration || ''
      return duration || poster ? { duration, poster } : null
    }
    const page = await fetchText(`https://vk.com/video${video.oid}_${video.id}`, signal)
    return page ? metaFromHtml(page) : null
  } catch {
    return null
  }
}

export async function fetchVideoMetaFromUrl(value: unknown, signal?: AbortSignal) {
  const video = detectBuiltVideo(value)
  return video ? fetchVideoMeta(video, signal) : null
}
