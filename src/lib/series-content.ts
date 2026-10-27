import 'server-only'
import { cache } from 'react'
import { connection } from 'next/server'
import type { LayoutBlock } from '../components/block-renderer'
import type { CmsCatalogProvider } from './catalog/cms-provider'
import { isCatalogSeries } from './catalog/types'
import { collectionHref, countCollectionProjects, isTechnologyCollection } from './catalog/collection'

type Part = { key?: string; text?: string; href?: string; image?: string }

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

const places = ['panel', 'barn', 'classic', 'modular'] as const
type HomeSeries = (typeof places)[number] | 'frame'

const fallbackImage: Record<HomeSeries, string> = {
  frame: '/series/panel.jpg',
  panel: '/series/panel.jpg',
  barn: '/series/barn.jpg',
  classic: '/series/classic.jpg',
  modular: '/series/modular.jpg',
}
const fallbackTitle: Record<HomeSeries, string> = {
  frame: 'Каркасные дома',
  panel: 'Панельно-каркасные дома',
  barn: 'Барнхаусы',
  classic: 'Классика',
  modular: 'Модульные дома',
}
// Четыре места в сетке; каждое может показывать серию или технологию.

// Число на плитке считается по её признаку: панельные и модульные — по технологии, остальные — по серии.
export async function applySeriesBento(blocks: readonly LayoutBlock[], catalog: CmsCatalogProvider, siteCode: string) {
  const parts = await readParts('seriesBento')
  const heading = parts?.find(part => part.key === 'seriesBento.heading')?.text
  const button = parts?.find(part => part.key === 'seriesBento.button')?.text
  const { items } = await catalog.list({ siteCode })
  const tiles = places.map((place, index) => {
    const part = parts?.find(item => item.key === `seriesBento.slot.${index}`)
    const series = part?.href && (isTechnologyCollection(part.href) || isCatalogSeries(part.href)) && part.href !== 'aframe' ? part.href : place
    return {
      id: `slot-${index}`,
      place,
      title: part?.text || fallbackTitle[series],
      href: collectionHref(series),
      image: part?.image || fallbackImage[series],
      count: countCollectionProjects(items, series),
    }
  })
  return blocks.map(block => block.blockType === 'seriesBento' ? { ...block, ...(heading ? { heading } : {}), ...(button ? { catalogLabel: button } : {}), items: tiles } : block)
}
