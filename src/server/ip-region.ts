import { isIP } from 'node:net'
import { regionFromGeoResponse } from '../lib/regional-suffix'
import type { TrafficRegion } from '../lib/region-traffic'

/** Traefik appends the connecting IP, as in the existing request limiter. */
export function visitorIPv4(headers: Headers): string | null {
  const forwarded = headers.get('x-forwarded-for')?.split(',').at(-1)?.trim() ?? ''
  const ip = forwarded.startsWith('::ffff:') ? forwarded.slice(7) : forwarded
  if (isIP(ip) !== 4) return null
  const [a, b, c] = ip.split('.').map(Number)
  if (a === 0 || a === 10 || a === 127 || a! >= 224 || a === 169 && b === 254 || a === 172 && b! >= 16 && b! <= 31 || a === 192 && (b === 168 || b === 0 && (c === 0 || c === 2)) || a === 100 && b! >= 64 && b! <= 127 || a === 198 && (b === 18 || b === 19 || b === 51 && c === 100) || a === 203 && b === 0 && c === 113) return null
  return ip
}

type Entry = { expires: number; value: Promise<TrafficRegion | null> }
export function createIPRegionResolver(send: typeof fetch = fetch, now = Date.now) {
  // Bounded, process-local cache. IPs never enter browser responses or application logs.
  const entries = new Map<string, Entry>()
  return async (headers: Headers): Promise<TrafficRegion | null> => {
    const ip = visitorIPv4(headers)
    if (!ip || /bot|crawler|spider|preview/i.test(headers.get('user-agent') ?? '')) return null
    const cached = entries.get(ip)
    if (cached && cached.expires > now()) return cached.value
    if (entries.size >= 5000) {
      for (const [key, entry] of entries) if (entry.expires <= now()) entries.delete(key)
      if (entries.size >= 5000) entries.delete(entries.keys().next().value!)
    }
    const entry: Entry = { expires: now() + 60_000, value: Promise.resolve(null) }
    entry.value = (async () => {
      try {
        const response = await send(`https://api.sypexgeo.net/json/${ip}`, { signal: AbortSignal.timeout(1200), cache: 'no-store', redirect: 'error' })
        if (!response.ok) return null
        const region = regionFromGeoResponse(await response.json())
        entry.expires = now() + (region ? 24 * 60 * 60_000 : 60 * 60_000)
        return region
      } catch { return null }
    })()
    entries.set(ip, entry)
    return entry.value
  }
}

export const resolveIPRegion = createIPRegionResolver()
