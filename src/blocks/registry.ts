export const REGISTERED_BLOCKS = [
  'hero',
  'advantagesBar',
  'popularProjects',
  'seriesBento',
  'mortgageShowcase',
  'textSection',
  'cta',
  'productionSection',
  'contactsSection',
  'leadForm',
  'projectsCatalog',
  'faq',
] as const

export type RegisteredBlock = (typeof REGISTERED_BLOCKS)[number]

export function isRegisteredBlock(type: string): type is RegisteredBlock {
  return (REGISTERED_BLOCKS as readonly string[]).includes(type)
}
