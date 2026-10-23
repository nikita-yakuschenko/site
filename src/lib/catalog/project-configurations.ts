import 'server-only'
import { configurationTiers, type ConfigurationData } from './project-configurations-data'
import type { PricedTier } from './tiers'
import type { SharedConfigurationContent } from './configuration-content'

export async function resolveProjectConfigurations(slug: string): Promise<PricedTier[] | null> {
  if (process.env.BROWSER_DIAGNOSTICS_FIXTURE_CATALOG === '1') {
    const { CATALOG_PROJECTS } = await import('./projects')
    const { configurationKeys } = await import('./configuration-rules')
    const project = CATALOG_PROJECTS.find(item => item.slug === slug)
    if (!project || project.readyHome) return null
    return configurationTiers(configurationKeys(project.technology === 'modular').map((key, index) => ({
      key, price: (index + 1) * 1_000_000,
      regionalPrices: { nn: (index + 1) * 1_000_000, msk: (index + 1) * 1_000_000 + 500_000 },
    })), project.technologyBadge)
  }
  const key = process.env.CMS_SITE_API_KEY
  if (!key) return null
  try {
    const origin = process.env.CMS_PUBLIC_URL || (process.env.NODE_ENV === 'production' ? 'https://cms.avgst.ru' : 'http://localhost:3001')
    const response = await fetch(`${origin}/api/projects/configurations?slug=${encodeURIComponent(slug)}`, { headers: { Authorization: `Bearer ${key}` }, cache: 'no-store', signal: AbortSignal.timeout(5000) })
    if (!response.ok) return null
    const data = await response.json() as { configurations: ConfigurationData[]; technologyBadge: string; sharedContent?: SharedConfigurationContent[] }
    return configurationTiers(data.configurations, data.technologyBadge, data.sharedContent)
  } catch { return null }
}
