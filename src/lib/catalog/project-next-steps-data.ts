export type NextStepsSettings = { enabled: boolean; visitEnabled: boolean; secondaryEnabled: boolean; order: 'visit-first' | 'secondary-first' }
export const defaultNextStepsSettings: NextStepsSettings = { enabled: true, visitEnabled: true, secondaryEnabled: true, order: 'visit-first' }

export function isNextStepsSettings(value: unknown): value is NextStepsSettings {
  if (!value || typeof value !== 'object') return false
  const settings = value as Record<string, unknown>
  return ['enabled', 'visitEnabled', 'secondaryEnabled'].every(key => typeof settings[key] === 'boolean') && ['visit-first', 'secondary-first'].includes(String(settings.order))
}
