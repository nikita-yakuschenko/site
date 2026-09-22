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
    { label: copy.readyHouses, href: '/catalog?status=ready' },
    { label: copy.mortgage, href: '/family-mortgage' },
    { label: copy.production, href: '/manufacture' },
    { label: copy.exposition, href: '/exposition' },
  ],
  footer: { legal: copy.offerDisclaimer },
  defaultSeo: { title: copy.seoTitle, description: copy.seoDescription },
} as const

/** Соцсети в подвале — между логотипом и коротким описанием.
 *  light — базовое состояние, original — на наведении.
 *  hrefMsk — отдельные аккаунты для региона «Московская область». */
export const FOOTER_SOCIALS = [
  {
    id: "vk",
    label: "ВКонтакте",
    href: "https://vk.com/avg_st",
    hrefMsk: "https://vk.com/avgstroy_msk",
    light: "/social/vk_light.svg",
    original: "/social/vk_original.svg",
  },
  {
    id: "telegram",
    label: "Telegram",
    href: "https://t.me/avgstroy",
    light: "/social/tg_light.svg",
    original: "/social/tg_original.svg",
  },
  {
    id: "max",
    label: "MAX",
    href: "https://max.ru/avg_st",
    light: "/social/max_light.svg",
    original: "/social/max_original.svg",
  },
  {
    id: "instagram",
    label: "Instagram",
    href: "https://www.instagram.com/avg_st/",
    hrefMsk: "https://www.instagram.com/avgstroy_msk/",
    light: "/social/instagram_light.svg",
    original: "/social/instagram_original.svg",
  },
  {
    id: "youtube",
    label: "YouTube",
    href: "https://www.youtube.com/@avgstroy",
    light: "/social/youtube_light.svg",
    original: "/social/youtube_original.svg",
  },
] as const

/** Ссылка на соцсеть с учётом региона (МСК — отдельные VK и Instagram). */
export function footerSocialHref(
  item: (typeof FOOTER_SOCIALS)[number],
  region: "nn" | "msk",
): string {
  if (region === "msk" && "hrefMsk" in item && item.hrefMsk) return item.hrefMsk
  return item.href
}

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
