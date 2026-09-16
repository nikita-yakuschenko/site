import { copy } from './copy'

/**
 * Описание корпоративного сайта.
 *
 * На ветке main эти данные лежат в коллекции Sites и приезжают из Payload по
 * имени хоста. Здесь они заданы статически — ровно теми значениями, которыми
 * их создаёт сид. Источник подменяется на CMS в AV4-10, потребители данных
 * (SiteChrome, BlockRenderer) при этом не меняются.
 */
export const SITE = {
  id: 'corporate',
  name: 'Авангард Строй',
  code: 'corporate',
  contacts: {
    phone: '+7 (831) 266-66-45',
    email: 'avgst@avgst.ru',
    address: 'Деловой центр «Ока», проспект Гагарина 27А к1',
  },
  /* Основная навигация — путь покупателя: выбрать проект, увидеть готовое,
     проверить производство. Контакты остаются кнопкой «Задать вопрос» в
     плашке и блоком в подвале. */
  navigation: [
    { label: copy.projects, href: '/catalog' },
    { label: copy.readyHouses, href: '/for-sale' },
    { label: copy.mortgage, href: '/mortgage' },
    { label: copy.production, href: '/manufacture' },
    { label: copy.exposition, href: '/exposition' },
  ],
  footer: { legal: copy.offerDisclaimer },
  defaultSeo: { title: copy.seoTitle, description: copy.seoDescription },
} as const

/** Год основания компании — нижняя граница копирайта в подвале. */
export const SITE_FOUNDED_YEAR = 2014

/**
 * Диапазон лет для строки «© … 2014 - 2026».
 * Верхняя граница — текущий календарный год; сама обновляется каждый год.
 */
export function copyrightYears(now: Date = new Date()): string {
  const end = now.getFullYear()
  if (end <= SITE_FOUNDED_YEAR) return String(SITE_FOUNDED_YEAR)
  return `${SITE_FOUNDED_YEAR} - ${end}`
}
