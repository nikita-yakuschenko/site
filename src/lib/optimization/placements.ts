export const OPTIMIZATION_PLACEMENTS = ['home.popular_projects', 'catalog.grid', 'home.series', 'project.related', 'project.page'] as const
export type OptimizationPlacement = typeof OPTIMIZATION_PLACEMENTS[number]

export const FORM_SOURCES = [
  'site.header.question', 'project.hero.question', 'project.contacts', 'site.contacts',
  'project.configuration.quote', 'project.mortgage.calculator', 'mortgage.calculator',
  'mortgage.consultation', 'project.next_steps.individual_visit', 'project.next_steps.architect',
  'factory.tour', 'home.hero.promo', 'factory.open_day', 'referral.registration', 'ready_home.offer',
] as const
export type FormSource = typeof FORM_SOURCES[number]
