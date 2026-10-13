import { configurationKeys, configurationNames, isModularTechnology, mortgageAllowed, validConfigurationKeys, type ConfigurationKey } from './configuration-rules'
import { tierDefinitions, type PricedTier } from './tiers'
import type { SharedConfigurationContent } from './configuration-content'

type TextRow = { text: string }
export type ConfigurationData = {
  key: ConfigurationKey; price: number; regionalPrices?: Partial<Record<'nn' | 'msk', number>>; lead?: string | null; includes?: TextRow[] | null; gifts?: TextRow[] | null;
  details?: { title: string; lead?: string | null; items?: TextRow[] | null; groups?: { title: string; items?: TextRow[] | null }[] | null }[] | null
}
export function configurationTiers(rows: ConfigurationData[], technologyBadge: string, shared?: SharedConfigurationContent[]): PricedTier[] | null {
  const modular = isModularTechnology(technologyBadge)
  if (!validConfigurationKeys(rows, modular) || rows.some(row => typeof row.price !== 'number' || !Number.isFinite(row.price) || row.price < 0)) return null
  return configurationKeys(modular).map(key => {
    const row = rows.find(row => row.key === key)!
    const base = tierDefinitions.find(tier => tier.id === key)!
    // Content is shared by configuration type; only prices belong to a project.
    const content = shared?.find(template => template.key === key)
    return { ...base, ...(content ? { lead: content.lead, includes: content.includes, gifts: content.gifts, details: content.details } : {}), name: configurationNames[key], price: row.regionalPrices?.nn ?? row.price, regionalPrices: row.regionalPrices, mortgage: mortgageAllowed(key) }
  })
}
