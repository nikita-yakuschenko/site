import 'server-only'
import { cache } from 'react'
import { connection } from 'next/server'
import type { LayoutBlock } from '../components/block-renderer'
import type { HeroMessage, HeroPromo } from '../components/hero-carousel'

type Part = { key?: string; title?: string; text?: string; textMore?: string; href?: string; image?: string; imageMobile?: string }

const readHeroParts = cache(async (): Promise<Part[] | null> => {
  await connection()
  const key = process.env.CMS_SITE_API_KEY
  if (!key) return null
  try {
    const origin = process.env.CMS_PUBLIC_URL || (process.env.NODE_ENV === 'production' ? 'https://cms.avgst.ru' : 'http://localhost:3001')
    const response = await fetch(`${origin}/api/blocks/content?key=hero`, { headers: { Authorization: `Bearer ${key}` }, cache: 'no-store', signal: AbortSignal.timeout(5000) })
    if (!response.ok) return null
    const data = await response.json()
    return Array.isArray(data.parts) ? data.parts : null
  } catch { return null }
})

// Saved hero copy replaces the coded banner. An empty CMS field keeps the coded value.
export async function withHeroContent(blocks: readonly LayoutBlock[]): Promise<LayoutBlock[]> {
  const parts = await readHeroParts()
  if (!parts?.length) return [...blocks]
  const part = (key: string) => parts.find(item => item.key === key)
  return blocks.map(block => {
    if (block.blockType !== 'hero') return block
    const message = { ...(block.message as HeroMessage) }
    const promos = (Array.isArray(block.promos) ? block.promos as HeroPromo[] : []).map(promo => ({ ...promo }))
    const heading = part('hero.heading')
    const subtitle = part('hero.subtitle')
    const button = part('hero.button')
    const background = part('hero.background')
    if (heading?.text) message.heading = heading.text
    if (heading?.textMore) message.headingMore = heading.textMore
    if (subtitle?.text) message.text = subtitle.text
    if (button?.text) message.cta = button.text
    if (button?.href) message.href = button.href
    if (background?.image) message.image = background.image
    if (background?.imageMobile) message.imageMobile = background.imageMobile
    for (const item of parts) {
      const match = /^hero\.promo\.(\d+)$/.exec(item.key || '')
      if (!match) continue
      const promo = promos[Number(match[1])]
      if (!promo) continue
      if (item.title) promo.heading = item.title
      if (item.text) promo.text = item.text
      if (item.textMore) promo.eyebrow = item.textMore
      if (item.href) promo.cta = item.href
      if (item.image) { promo.image = item.image; promo.cutout = false }
    }
    return { ...block, message, promos }
  })
}
