import { IconArticle, IconBuildingBank, IconBulb, IconClipboardList, IconCube3dSphere, IconHomeHeart, IconMessageStar, IconNews, IconScale } from '@tabler/icons-react'
import type { Topic } from './content'

export const topicIcons = {
  news: IconNews,
  technology: IconCube3dSphere,
  mortgage: IconBuildingBank,
  law: IconScale,
  articles: IconArticle,
  idea: IconBulb,
  lifestile: IconHomeHeart,
  reviews: IconClipboardList,
  testimonials: IconMessageStar,
} satisfies Record<Topic['slug'], typeof IconNews>
