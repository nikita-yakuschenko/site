import 'server-only'
import { cache } from 'react'
import { connection } from 'next/server'
import type { LayoutBlock } from '../components/block-renderer'
import type { CmsCatalogProvider } from './catalog/cms-provider'
import { isCatalogSeries, type CatalogSeries } from './catalog/types'

type Part = { key?: string; text?: string; href?: string; image?: string }

const readParts = cache(async (key: string): Promise<Part[] | null> => {
  await connection()
  const apiKey = process.env.CMS_SITE_API_KEY
  if (!apiKey) return null
  try {
    const origin = process.env.CMS_PUBLIC_URL || (process.env.NODE_ENV === 'production' ? 'https://cms.avgst.ru' : 'http://localhost:3001')
    const response = await fetch(`${origin}/api/blocks/content?key=${encodeURIComponent(key)}`, { headers: { Authorization: `Bearer ${apiKey}` }, cache: 'no-store', signal: AbortSignal.timeout(5000) })
    if (!response.ok) return null
    const data = await response.json()
    return Array.isArray(data.parts) ? data.parts : null
  } catch { return null }
})

const fallbackImage: Record<CatalogSeries, string> = {
  panel: '/series/panel.jpg',
  barn: '/series/barn.jpg',
  classic: '/series/classic.jpg',
  modular: '/series/modular.jpg',
}
const fallbackTitle: Record<CatalogSeries, string> = {
  panel: 'Панельно-каркасные дома',
  barn: 'Барнхаусы',
  classic: 'Классика',
  modular: 'Модульные дома',
}
const places: CatalogSeries[] = ['panel', 'barn', 'classic', 'modular']

// The badge counts published catalog projects of the bound series. The number is not stored.
export async function applySeriesBento(blocks: readonly LayoutBlock[], catalog: CmsCatalogProvider, siteCode: string) {
  const parts = await readParts('seriesBento')
  const heading = parts?.find(part => part.key === 'seriesBento.heading')?.text
  const button = parts?.find(part => part.key === 'seriesBento.button')?.text
  const { items } = await catalog.list({ siteCode })
  const counts = new Map<string, number>()
  for (const item of items) counts.set(item.series, (counts.get(item.series) || 0) + 1)
  const tiles = places.map((place, index) => {
    const part = parts?.find(item => item.key === `seriesBento.slot.${index}`)
    const series = part?.href && isCatalogSeries(part.href) ? part.href : place
    return {
      id: `slot-${index}`,
      place,
      title: part?.text || fallbackTitle[series],
      href: `/catalog?series=${series}`,
      image: part?.image || fallbackImage[series],
      count: counts.get(series) || 0,
    }
  })
  return blocks.map(block => block.blockType === 'seriesBento' ? { ...block, ...(heading ? { heading } : {}), ...(button ? { catalogLabel: button } : {}), items: tiles } : block)
}
