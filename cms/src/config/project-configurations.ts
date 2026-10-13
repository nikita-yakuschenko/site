import { configurationKeys, configurationNames, isModularTechnology, mortgageAllowed } from '../../../src/lib/catalog/configuration-rules'
import { tierDefinitions } from '../../../src/lib/catalog/tiers'
import type { ConfigurationData } from '../../../src/lib/catalog/project-configurations-data'

export function normalizeConfigurations(rows: Record<string, unknown>[], badge: string) {
  return configurationKeys(isModularTechnology(badge)).map(key => {
    const row = rows.find(row => row.key === key)
    const base = tierDefinitions.find(tier => tier.id === key)!
    return { ...(row || { key, price: 0, lead: base.lead, includes: base.includes.map(text => ({ text })), gifts: base.gifts?.map(text => ({ text })), details: base.details.map(detail => ({ ...detail, items: detail.items?.map(text => ({ text })), groups: detail.groups?.map(group => ({ title: group.title, items: group.items.map(text => ({ text })) })) })) }), key, price: row?.price ?? 0, name: configurationNames[key], mortgage: mortgageAllowed(key) } as ConfigurationData & { name: string; mortgage: boolean }
  })
}
