import { configurationKeys, isModularTechnology, type ConfigurationKey } from './configuration-rules'
import { technologyFromBadge, type CatalogTechnology } from './types'
import { tierDefinitionsForTechnology, type TierDetail } from './tiers'

type TextRow = { text: string }
export type TemplateContent = { includesTitle?: string | null; lead?: string | null; includes?: TextRow[] | null; gifts?: TextRow[] | null; details?: { title: string; lead?: string | null; items?: TextRow[] | null; groups?: { title: string; items?: TextRow[] | null }[] | null }[] | null }
export type ConfigurationTemplatesData = Partial<Record<CatalogTechnology, Partial<Record<ConfigurationKey, TemplateContent>> | null>>
export type SharedConfigurationContent = { key: ConfigurationKey; includesTitle?: string; lead: string; includes: string[]; gifts: string[]; details: TierDetail[] }
export function defaultConfigurationTemplates() {
  const variant = (technology: CatalogTechnology) => Object.fromEntries(configurationKeys(technology === 'modular').map(key => {
    const tier = tierDefinitionsForTechnology(technology).find(tier => tier.id === key)!
    return [key, { ...(tier.includesTitle ? { includesTitle: tier.includesTitle } : {}), lead: tier.lead, includes: tier.includes.map(text => ({ text })), gifts: (tier.gifts || []).map(text => ({ text })), details: tier.details.map(detail => ({ title: detail.title, lead: detail.lead, items: detail.items?.map(text => ({ text })), groups: detail.groups?.map(group => ({ title: group.title, items: group.items.map(text => ({ text })) })) })) }]
  }))
  return { panel: variant('panel'), modular: variant('modular'), frame: variant('frame') }
}
export function sharedConfigurationContent(data: ConfigurationTemplatesData, technology: string): SharedConfigurationContent[] {
  const modular = isModularTechnology(technology)
  const technologyKey = technologyFromBadge(technology)
  const group = data[technologyKey]
  return configurationKeys(modular).map(key => {
    const base = tierDefinitionsForTechnology(technologyKey).find(tier => tier.id === key)!
    const row = group?.[key]
    if (!row) return { key, ...(base.includesTitle ? { includesTitle: base.includesTitle } : {}), lead: base.lead, includes: [...base.includes], gifts: [...(base.gifts || [])], details: [...base.details] }
    return {
      key, ...(row.includesTitle ? { includesTitle: row.includesTitle } : {}), lead: row.lead || '',
      includes: (row.includes || []).map(item => item.text),
      gifts: (row.gifts || []).map(item => item.text),
      details: (row.details || []).map(detail => ({
        title: detail.title, lead: detail.lead || undefined,
        items: (detail.items || []).map(item => item.text),
        groups: (detail.groups || []).map(group => ({ title: group.title, items: (group.items || []).map(item => item.text) })),
      })),
    }
  })
}
