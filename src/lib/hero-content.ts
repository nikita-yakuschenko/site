import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import sharp from 'sharp'
import { connection } from 'next/server'
import type { LayoutBlock } from '../components/block-renderer'
import type { HeroMessage, HeroPromo } from '../components/hero-carousel'

type Part = { key?: string; title?: string; text?: string; textMore?: string; href?: string; action?: string; url?: string; form?: string; image?: string; imageMobile?: string }

const readHeroParts = cache(async (): Promise<Part[] | null> => {
  await connection()
  const key = process.env.CMS_SITE_API_KEY
  if (!key) return null
  try {
    const origin = process.env.CMS_PUBLIC_URL || (process.env.NODE_ENV === 'production' ? 'https://cms.avgst.ru' : 'http://localhost:3001')
    const response = await fetch(`${origin}/api/blocks/content?key=hero`, { headers: { Authorization: `Bearer ${key}` }, next: { revalidate: 60 }, signal: AbortSignal.timeout(5000) })
    if (!response.ok) return null
    const data = await response.json()
    return Array.isArray(data.parts) ? data.parts : null
  } catch { return null }
})

// Saved hero copy replaces the coded banner. A cleared subtitle is removed.
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
    // Пустой подзаголовок в CMS снимает текст. Раньше пустая строка считалась «поле не задано» и оставалась фраза из кода.
    if (subtitle) message.text = subtitle.text || ''
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
      promo.action = item.action === 'link' ? 'link' : 'form'
      promo.url = item.url || ''
      promo.formKey = item.form || ''
      if (item.image) { promo.image = item.image; promo.cutout = false }
    }
    return { ...block, message, promos }
  })
}


// A tiny inline preview avoids an empty hero while the responsive image loads.
const heroPreview = unstable_cache(async (source: string) => {
  const url = new URL(source, 'https://avgst.ru')
  if (url.origin !== 'https://cms.avgst.ru' || !url.pathname.startsWith('/api/media/file/')) return undefined
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(2000) })
    if (!response.ok) return undefined
    const image = await sharp(Buffer.from(await response.arrayBuffer())).resize({ width: 128 }).webp({ quality: 55 }).toBuffer()
    return `data:image/webp;base64,${image.toString('base64')}`
  } catch { return undefined }
}, ['hero-inline-preview-v2'], { revalidate: 86400 })

export async function withHeroPreviews(blocks: LayoutBlock[]): Promise<LayoutBlock[]> {
  return Promise.all(blocks.map(async block => {
    if (block.blockType !== 'hero') return block
    const message = block.message as HeroMessage
    const [imagePreview, mobilePreview] = await Promise.all([heroPreview(message.image), message.imageMobile ? heroPreview(message.imageMobile) : undefined])
    return { ...block, message: { ...message, imagePreview, mobilePreview } }
  }))
}
