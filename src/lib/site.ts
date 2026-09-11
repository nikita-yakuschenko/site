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
    phone: '8 (800) 000-00-00',
    email: 'hello@avgst.ru',
    address: 'Нижний Новгород',
  },
  navigation: [
    { label: copy.catalogProjects, href: '/projects' },
    { label: copy.contacts, href: '/#contacts' },
  ],
  footer: { legal: copy.offerDisclaimer },
  defaultSeo: { title: copy.seoTitle, description: copy.seoDescription },
} as const
