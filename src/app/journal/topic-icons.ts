import { IconArticle, IconBuildingBank, IconBuildingFactory, IconBulb, IconClipboardList, IconCube3dSphere, IconHomeHeart, IconMessageStar, IconNews, IconScale } from '@tabler/icons-react'
import type { JournalSection } from './content'

export const topicIcons = {
  news: IconNews,
  technology: IconCube3dSphere,
  mortgage: IconBuildingBank,
  law: IconScale,
  articles: IconArticle,
  idea: IconBulb,
  lifestile: IconHomeHeart,
  reviews: IconClipboardList,
  company: IconBuildingFactory,
  testimonials: IconMessageStar,
} satisfies Record<JournalSection['slug'], typeof IconNews>
