'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { IconArrowUpRight } from '@tabler/icons-react'
import { usePathname } from 'next/navigation'
import { copy } from '../lib/copy'
import type { CatalogProject } from '../lib/catalog/types'
import type { LayoutBlock } from './block-renderer'
import { ProjectCard } from './project-card'

const accentSeedKey = 'avgst:popular-card-accent'
let accentSeed: number | null = null

function subscribeAccentSeed(notify: () => void) {
  if (accentSeed === null) {
    accentSeed = Math.random()
    try {
      const saved = localStorage.getItem(accentSeedKey)
      const value = Number(saved)
      if (saved !== null && value >= 0 && value < 1) accentSeed = value
      else localStorage.setItem(accentSeedKey, String(accentSeed))
    } catch {
      // Keep the selection for this page session if storage is unavailable.
    }
    notify()
  }
  return () => {}
}

function popularAccents(count: number, seed: number | null): number[] {
  if (!count || seed === null) return []
  const pairs: [number, number][] = []
  for (let first = 0; first < count; first++) {
    for (let second = first + 2; second < count; second++) {
      const separated = [2, 3].every(columns => {
        const rowGap = Math.floor(second / columns) - Math.floor(first / columns)
        return rowGap > 1 || (rowGap === 1 && first % columns !== second % columns)
      })
      if (separated) pairs.push([first, second])
    }
  }
  const pair = seed >= 0.5 ? pairs[Math.floor((seed * 2 - 1) * pairs.length)] : undefined
  return pair ?? [Math.floor(((seed * 2) % 1) * count)]
}

function usePreviewPopular(heading: string, button: string, projects: CatalogProject[]) {
  const [draft, setDraft] = useState<{ heading?: string; button?: string; projects?: CatalogProject[] } | null>(null)
  useEffect(() => {
    if (window.parent === window || !new URLSearchParams(window.location.search).has('cmsPreview')) return
    const allowed = new Set(['http://localhost:3001', 'https://cms.avgst.ru'])
    const receive = (event: MessageEvent) => {
      if (event.source !== window.parent || !allowed.has(event.origin) || event.data?.type !== 'avgst:preview-popular') return
      setDraft({ heading: event.data.heading, button: event.data.button, projects: Array.isArray(event.data.projects) ? event.data.projects : [] })
    }
    window.addEventListener('message', receive)
    return () => window.removeEventListener('message', receive)
  }, [])
  return { heading: draft?.heading || heading, button: draft?.button || button, projects: draft?.projects?.length ? draft.projects : projects }
}

export function PopularProjects({ block, projects }: { block: LayoutBlock; projects: CatalogProject[] }) {
  const shown = usePreviewPopular(String(block.heading || copy.popularHeading), String(block.catalogLabel || copy.allProjects), projects)
  const isHome = usePathname() === '/'
  const seed = useSyncExternalStore(subscribeAccentSeed, () => accentSeed, () => null)
  const accents = popularAccents(shown.projects.length, isHome ? seed : null)
  return (
    <section className={block.muted === true ? 'section section--muted' : 'section'} data-cms-block="popularProjects">
      <div className="section__inner">
        <div className="section__head" data-cms-block="popularProjects.heading">
          <div>
            {block.showEyebrow !== false ? <p className="eyebrow">{String(block.eyebrow || copy.popularEyebrow)}</p> : null}
            <h2>{shown.heading}</h2>
          </div>
          <a className="btn btn-yellow section__catalog-cta section__catalog-cta--desktop" href={String(block.catalogHref || '/catalog')}>
            {shown.button}
            <IconArrowUpRight size={18} stroke={2} />
          </a>
        </div>
        <div className="grid-3" data-cms-block="popularProjects.cards">
          {shown.projects.map((project, index) => <ProjectCard key={project.id} project={project} darkAccent={accents.includes(index)} />)}
        </div>
        <a className="btn btn-yellow section__catalog-cta section__catalog-cta--mobile" href={String(block.catalogHref || '/catalog')} data-cms-block="popularProjects.button">
          {shown.button}
          <IconArrowUpRight size={18} stroke={2} />
        </a>
      </div>
    </section>
  )
}
