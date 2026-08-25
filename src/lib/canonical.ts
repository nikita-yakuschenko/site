import { normalizeHost } from './host'

export function publicOrigin(hostHeader: string): string {
  const host = normalizeHost(hostHeader) || 'localhost'
  const proto = host === 'localhost' || host.startsWith('127.') ? 'http' : 'https'
  const port = process.env.PORT || '3000'
  if (host === 'localhost') return `${proto}://${host}:${port}`
  return `${proto}://${host}`
}

export function canonicalUrl(hostHeader: string, fullPath: string): string {
  const origin = publicOrigin(hostHeader)
  const path = fullPath === '/' ? '/' : fullPath
  return `${origin}${path}`
}
