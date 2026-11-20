export const headerTopics = [
  { slug: 'news', title: 'Новости', description: 'События и новости загородного строительства.' },
  { slug: 'technology', title: 'Технологии', description: 'Как устроены дома и что проверить при выборе технологии.' },
  { slug: 'mortgage', title: 'Ипотека', description: 'Материалы об ипотеке на загородный дом.' },
  { slug: 'law', title: 'Законодательство', description: 'Правовые вопросы загородного строительства.' },
  { slug: 'articles', title: 'Статьи', description: 'Все статьи журнала «Авангард Строй».' },
] as const

export const articleTopics = [
  { slug: 'idea', title: 'Идеи', description: 'Идеи для загородного дома.' },
  { slug: 'lifestile', title: 'Загородная жизнь', description: 'Подготовка к переезду и жизни за городом.' },
  { slug: 'reviews', title: 'Обзоры', description: 'Обзоры проектов, планировок и построенных домов.' },
  { slug: 'testimonials', title: 'Отзывы', description: 'Отзывы владельцев о домах и опыте строительства.' },
] as const

export const topics = [
  ...headerTopics,
  ...articleTopics,
] as const

export type Topic = typeof topics[number]
export type Story = {
  slug: string
  topic: Exclude<Topic['slug'], 'news'>
  publishedAt: string
  title: string
  description: string
  image: string
  alt: string
  format: 'article' | 'video'
  bodyHtml: string
  bodyText: string
  videoUrl: string
  tags: string[]
}

export const getTopic = (slug: string) => topics.find(topic => topic.slug === slug)
export const articleUrl = (slug: string) => `/journal/${slug}`
const publicationDate = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'long', timeZone: 'Europe/Moscow' })
export const formatPublicationDate = (publishedAt: string) => publicationDate.format(new Date(publishedAt))
export const readingMinutes = (story: Story) =>
  Math.max(1, Math.ceil(story.bodyText.trim().split(/\s+/).length / 180))
