export type ProjectContentSource = 'mock' | 'database' | 'system'

// Source of the public block's content, not the CMS form or block ordering.
// System blocks have no content settings on individual project pages.
export const projectContentSources = {
  projectHero: 'mock',
  ProjectExteriors: 'mock',
  ProjectPlans: 'mock',
  ProjectInteriors: 'mock',
  ProjectBuilt: 'mock',
  MortgageCalculator: 'database',
  ProjectConfig: 'database',
  ReadyHomeOffer: 'mock',
  ProjectNextSteps: 'database',
  ProjectSimilar: 'system',
  contactsSection: 'system',
} satisfies Record<string, ProjectContentSource>

export type ProjectContentBlock = keyof typeof projectContentSources

export const projectSourceLabels: Record<ProjectContentSource, { label: string; description: string }> = {
  mock: { label: 'Мок', description: 'Содержимое блока на сайте берётся из исходников. Изменения полей CMS пока не отображаются на сайте.' },
  database: { label: 'БД', description: 'Содержимое блока на сайте берётся из базы CMS.' },
  system: { label: 'Системный', description: '' },
}
