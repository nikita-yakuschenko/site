export const headerTopics = [
  { slug: 'news', title: 'Новости', description: 'События и новости загородного строительства.' },
  { slug: 'technology', title: 'Технологии', description: 'Как устроены дома и что проверить при выборе технологии.' },
  { slug: 'mortgage', title: 'Ипотека', description: 'Материалы об ипотеке на загородный дом.' },
  { slug: 'law', title: 'Законодательство', description: 'Правовые вопросы загородного строительства.' },
  { slug: 'reviews', title: 'Обзоры', description: 'Обзоры проектов, планировок и построенных домов.' },
  { slug: 'articles', title: 'Статьи', description: 'Все статьи журнала «Авангард Строй».' },
] as const

export const articleTopics = [
  { slug: 'idea', title: 'Идеи', description: 'Идеи для загородного дома.' },
  { slug: 'lifestile', title: 'Загородная жизнь', description: 'Подготовка к переезду и жизни за городом.' },
  { slug: 'company', title: 'О компании', description: 'Производство, события и работа «Авангард Строй».' },
  { slug: 'testimonials', title: 'Отзывы', description: 'Отзывы владельцев о домах и опыте строительства.' },
] as const

const sections = [...headerTopics, ...articleTopics] as const

export type JournalSection = typeof sections[number]
export type Topic = Exclude<JournalSection, { slug: 'news' | 'articles' }>
export type Story = {
  slug: string
  topic: Topic['slug'] | null
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

export const getJournalSection = (slug: string) => sections.find(section => section.slug === slug)
export const getTopic = (slug: string | null): Topic | undefined => sections.find((section): section is Topic => section.slug === slug && section.slug !== 'news' && section.slug !== 'articles')
export const articleUrl = (slug: string) => `/journal/${slug}`
const publicationDate = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'long', timeZone: 'Europe/Moscow' })
export const formatPublicationDate = (publishedAt: string) => publicationDate.format(new Date(publishedAt))
export const readingMinutes = (story: Story) =>
  Math.max(1, Math.ceil(story.bodyText.trim().split(/\s+/).length / 180))

export type StoryPreview = Pick<Story, 'slug' | 'topic' | 'format' | 'title' | 'description' | 'publishedAt' | 'image' | 'alt'> & { minutes: number }
export type JournalFeedFilters = { topic?: string; query?: string; videoOnly: boolean }
export type JournalFeedPage = {
  items: { story: StoryPreview; reactions?: { likes: number; shares: number } }[]
  next: string | null
}

export function storyPreview(story: Story): StoryPreview {
  const { slug, topic, format, title, description, publishedAt, image, alt } = story
  return { slug, topic, format, title, description, publishedAt, image, alt, minutes: readingMinutes(story) }
}
