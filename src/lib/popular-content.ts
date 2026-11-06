import 'server-only'
import { cache } from 'react'
import { connection } from 'next/server'
import type { LayoutBlock } from '../components/block-renderer'
import { catalogOrder } from './catalog/order'
import type { CatalogProject } from './catalog/types'
import type { CmsCatalogProvider } from './catalog/cms-provider'

type Part = { key?: string; text?: string; href?: string }

const readParts = cache(async (key: string): Promise<Part[] | null> => {
  await connection()
  const apiKey = process.env.CMS_SITE_API_KEY
  if (!apiKey) return null
  try {
    const origin = process.env.CMS_PUBLIC_URL || (process.env.NODE_ENV === 'production' ? 'https://cms.avgst.ru' : 'http://localhost:3001')
    const response = await fetch(`${origin}/api/blocks/content?key=${encodeURIComponent(key)}`, { headers: { Authorization: `Bearer ${apiKey}` }, next: { revalidate: 60 }, signal: AbortSignal.timeout(5000) })
    if (!response.ok) return null
    const data = await response.json()
    return Array.isArray(data.parts) ? data.parts : null
  } catch { return null }
})

// Пустые слоты держат одни и те же шесть проектов. Случайный набор на каждый
// заход менял карточки при переходе на главную, и их фото оставались серыми,
// пока заново не скачивались.
function stablePopular(items: CatalogProject[], limit: number) {
  return catalogOrder(items, 'popular').slice(0, limit)
}

// Assigned slots stay in the chosen order. Empty slots stay stable.
export async function applyPopularProjects(blocks: readonly LayoutBlock[], catalog: CmsCatalogProvider, siteCode: string) {
  const parts = await readParts('popularProjects')
  const heading = parts?.find(part => part.key === 'popularProjects.heading')?.text
  const button = parts?.find(part => part.key === 'popularProjects.button')?.text
  const next = blocks.map(block => block.blockType === 'popularProjects' ? { ...block, ...(heading ? { heading } : {}), ...(button ? { catalogLabel: button } : {}) } : block)
  const { items } = await catalog.list({ siteCode })
  const chosen = (parts || []).filter(part => /^popularProjects\.slot\.\d+$/.test(part.key || '') && part.href)
  const projects = chosen.map(part => items.find(item => item.cmsId === part.href)).filter((item): item is CatalogProject => Boolean(item))
  return { blocks: next, projects: projects.length ? projects : stablePopular(items, 6) }
}
