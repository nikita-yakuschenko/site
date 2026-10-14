'use client'

import { useEffect, useState } from 'react'
import { IconArrowUpRight } from '@tabler/icons-react'
import { copy } from '../lib/copy'
import type { CatalogProject } from '../lib/catalog/types'
import type { LayoutBlock } from './block-renderer'
import { ProjectCard } from './project-card'

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
  return (
    <section className="section" data-cms-block="popularProjects">
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
          {shown.projects.map(project => <ProjectCard key={project.id} project={project} />)}
        </div>
        <a className="btn btn-yellow section__catalog-cta section__catalog-cta--mobile" href={String(block.catalogHref || '/catalog')} data-cms-block="popularProjects.button">
          {shown.button}
          <IconArrowUpRight size={18} stroke={2} />
        </a>
      </div>
    </section>
  )
}
