export const configurationNames = { start: 'Стартовая', standard: 'Стандартная', project: 'Проектная', turnkey: 'Под ключ' } as const
export type ConfigurationKey = keyof typeof configurationNames
export function configurationName(key: ConfigurationKey, technology: unknown) {
  return key === 'project' && (technology === 'frame' || typeof technology === 'string' && /^каркасн/i.test(technology)) ? 'Расширенная' : configurationNames[key]
}
export const configurationKeys = (modular: boolean): ConfigurationKey[] => modular ? ['standard', 'project', 'turnkey'] : ['start', 'standard', 'project']
// Стартовая у модульного дома хранится в прайсе и не входит в публичные комплектации.
export const priceConfigurationKeys = (modular: boolean): ConfigurationKey[] => modular ? ['start', 'standard', 'project', 'turnkey'] : configurationKeys(false)
export const isModularTechnology = (badge: unknown) => typeof badge === 'string' && /модул/i.test(badge)
export const mortgageAllowed = (key: string) => key !== 'start'

export function validConfigurationKeys(rows: unknown, modular: boolean): boolean {
  if (!Array.isArray(rows)) return false
  const keys = configurationKeys(modular)
  return rows.length === keys.length && keys.every(key => rows.filter(row => row?.key === key).length === 1)
}
