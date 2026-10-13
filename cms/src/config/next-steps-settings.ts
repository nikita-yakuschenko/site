export type NextStepsSettings = { enabled: boolean; visitEnabled: boolean; secondaryEnabled: boolean; order: 'visit-first' | 'secondary-first' }

export function normalizeNextStepsSettings(value?: { [Key in keyof NextStepsSettings]?: NextStepsSettings[Key] | null } | null): NextStepsSettings {
  return { enabled: value?.enabled !== false, visitEnabled: value?.visitEnabled !== false, secondaryEnabled: value?.secondaryEnabled !== false, order: value?.order === 'secondary-first' ? 'secondary-first' : 'visit-first' }
}
