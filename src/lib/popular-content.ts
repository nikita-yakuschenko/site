import 'server-only'
import { cache } from 'react'
import { connection } from 'next/server'
import type { LayoutBlock } from '../components/block-renderer'
import type { CatalogProject } from './catalog/types'
import type { CmsCatalogProvider } from './catalog/cms-provider'

type Part = { key?: string; text?: string; href?: string }

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

function sample(items: CatalogProject[], limit: number) {
  const pool = [...items]
  const picked: CatalogProject[] = []
  while (pool.length && picked.length < limit) {
    const [next] = pool.splice(Math.floor(Math.random() * pool.length), 1)
    if (next) picked.push(next)
  }
  return picked
}

// Empty slots take a fresh random six. Assigned slots stay in the chosen order.
export async function applyPopularProjects(blocks: readonly LayoutBlock[], catalog: CmsCatalogProvider, siteCode: string) {
  const parts = await readParts('popularProjects')
  const heading = parts?.find(part => part.key === 'popularProjects.heading')?.text
  const button = parts?.find(part => part.key === 'popularProjects.button')?.text
  const next = blocks.map(block => block.blockType === 'popularProjects' ? { ...block, ...(heading ? { heading } : {}), ...(button ? { catalogLabel: button } : {}) } : block)
  const { items } = await catalog.list({ siteCode })
  const chosen = (parts || []).filter(part => /^popularProjects\.slot\.\d+$/.test(part.key || '') && part.href)
  const projects = chosen.map(part => items.find(item => item.cmsId === part.href)).filter((item): item is CatalogProject => Boolean(item))
  return { blocks: next, projects: projects.length ? projects : sample(items, 6) }
}
