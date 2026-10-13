import { configurationKeys, isModularTechnology, type ConfigurationKey } from './configuration-rules'
import { tierDefinitions, type TierDetail } from './tiers'

type TextRow = { text: string }
export type TemplateContent = { lead?: string | null; includes?: TextRow[] | null; gifts?: TextRow[] | null; details?: { title: string; lead?: string | null; items?: TextRow[] | null; groups?: { title: string; items?: TextRow[] | null }[] | null }[] | null }
export type ConfigurationTemplatesData = { panel?: Partial<Record<ConfigurationKey, TemplateContent>> | null; modular?: Partial<Record<ConfigurationKey, TemplateContent>> | null }
export type SharedConfigurationContent = { key: ConfigurationKey; lead: string; includes: string[]; gifts: string[]; details: TierDetail[] }
export function defaultConfigurationTemplates() {
  const variant = (modular: boolean) => Object.fromEntries(configurationKeys(modular).map(key => {
    const tier = tierDefinitions.find(tier => tier.id === key)!
    return [key, { lead: tier.lead, includes: tier.includes.map(text => ({ text })), gifts: (tier.gifts || []).map(text => ({ text })), details: tier.details.map(detail => ({ title: detail.title, lead: detail.lead, items: detail.items?.map(text => ({ text })), groups: detail.groups?.map(group => ({ title: group.title, items: group.items.map(text => ({ text })) })) })) }]
  }))
  return { panel: variant(false), modular: variant(true) }
}
export function sharedConfigurationContent(data: ConfigurationTemplatesData, technology: string): SharedConfigurationContent[] {
  const modular = isModularTechnology(technology)
  const group = modular ? data.modular : data.panel
  return configurationKeys(modular).map(key => {
    const base = tierDefinitions.find(tier => tier.id === key)!
    const row = group?.[key]
    if (!row) return { key, lead: base.lead, includes: [...base.includes], gifts: [...(base.gifts || [])], details: [...base.details] }
    return {
      key, lead: row.lead || '',
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
