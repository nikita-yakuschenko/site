import { redirectPath, redirectTarget, type RedirectRule } from './redirect-rules'
let cached: RedirectRule[] = []
let expires = 0
let pending: Promise<void> | null = null

export async function managedRedirect(source: URL): Promise<URL | null> {
  if (Date.now() > expires) {
    pending ??= (async () => {
      try {
        const origin = process.env.CMS_PUBLIC_URL || 'https://cms.avgst.ru'
        const response = await fetch(`${origin}/api/pages/redirects`, { cache: 'no-store', signal: AbortSignal.timeout(1500) })
        if (!response.ok) throw new Error('Redirect registry unavailable')
        const data = await response.json()
        if (!Array.isArray(data.rules)) throw new Error('Invalid redirect registry')
        cached = data.rules.flatMap((rule: RedirectRule) => {
          try { return [{ source: redirectPath(rule.source, true), target: redirectPath(rule.target) }] } catch { return [] }
        })
        expires = Date.now() + 30000
      } catch { expires = Date.now() + 5000 } // Keep last known rules during a CMS outage.
      finally { pending = null }
    })()
    await pending
  }
  const nested = /^\/catalog\/(?:modulnye-doma|panelno-karkasnye-doma)\/product\/([^/]+)\/?$/.exec(source.pathname)
  try {
    const exact = redirectTarget(source.pathname.replace(/\/+$/, '') + source.search, cached)
    const target = exact ?? (nested ? redirectTarget(`/catalog/${nested[1]}${source.search}`, cached) : null)
    if (!target) return null
    const result = new URL(source)
    const path = new URL(target, 'https://avgst.ru')
    result.pathname = path.pathname
    result.search = path.search
    result.hash = path.hash
    return result
  } catch { return null } // A malformed legacy registry cannot take the site down.
}
