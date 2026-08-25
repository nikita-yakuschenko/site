export function normalizeHost(hostHeader: string): string {
  return hostHeader.split(':')[0]?.trim().toLowerCase().replace(/^www\./, '') || ''
}

export type SiteHostRecord = {
  code: string
  status: string
  subdomain?: string | null
  customDomains?: Array<{ hostname?: string | null }> | null
}

export function resolveSiteByHost(
  sites: SiteHostRecord[],
  hostHeader: string,
  options?: { includeDrafts?: boolean },
): SiteHostRecord | null {
  const host = normalizeHost(hostHeader)
  if (!host) return null

  const pool = options?.includeDrafts ? sites : sites.filter((site) => site.status === 'published')

  const byCustom = pool.find((site) =>
    (site.customDomains || []).some((row) => normalizeHost(row.hostname || '') === host),
  )
  if (byCustom) return byCustom

  const bySub = pool.find((site) => {
    const sub = site.subdomain?.trim().toLowerCase()
    if (!sub) return false
    return host === sub || host.startsWith(`${sub}.`)
  })
  if (bySub) return bySub

  return pool.find((site) => site.code === 'corporate') || pool[0] || null
}

export function assertUniqueHostnames(sites: SiteHostRecord[], currentCode?: string): string[] {
  const seen = new Map<string, string>()
  const duplicates: string[] = []

  for (const site of sites) {
    if (currentCode && site.code === currentCode) continue
    const hosts = [
      ...(site.customDomains || []).map((row) => normalizeHost(row.hostname || '')),
      site.subdomain && site.subdomain.includes('.') ? normalizeHost(site.subdomain) : '',
    ].filter(Boolean)

    for (const host of hosts) {
      const owner = seen.get(host)
      if (owner && owner !== site.code) duplicates.push(host)
      else seen.set(host, site.code)
    }
  }

  return duplicates
}
