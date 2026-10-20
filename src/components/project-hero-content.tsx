'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { splitProjectName } from '../lib/project-name'
import { copy } from '../lib/copy'
import { isProjectHeroData, type ProjectHeroData } from '../lib/catalog/project-hero-data'
import { preload } from 'react-dom'
import { optimizedSrc, optimizedSrcSet } from '../lib/media'
import { LeadDialog } from './lead-dialog'

export function ProjectHeroContent({ data, connected, location, payment }: { data: ProjectHeroData; connected: boolean; location?: string; payment: ReactNode }) {
  const [draft, setDraft] = useState<ProjectHeroData | null>(null)
  const [brokenImage, setBrokenImage] = useState('')
  const [askOpen, setAskOpen] = useState(false)
  const current = draft || data
  // Unfinished drafts show explicit placeholders instead of blanks
  const hero = { ...current, name: current.name.trim() || 'Без названия', technologyBadge: current.technologyBadge || 'Не выбрана' }
  useEffect(() => {
    if (!connected || window.parent === window || !new URLSearchParams(window.location.search).has('cmsPreview')) return
    const allowed = new Set(['http://localhost:3001', 'https://cms.avgst.ru'])
    const receive = (event: MessageEvent) => {
      if (event.source === window.parent && allowed.has(event.origin) && event.data?.type === 'avgst:preview-hero' && isProjectHeroData(event.data.hero)) setDraft(event.data.hero)
    }
    window.addEventListener('message', receive)
    return () => window.removeEventListener('message', receive)
  }, [connected])
  const divider = location ? hero.name.toLocaleLowerCase('ru').lastIndexOf(' в ') : -1
  const { head, mark, tail } = splitProjectName(divider > 0 ? hero.name.slice(0, divider) : hero.name)
  const specs = [
    { label: copy.area, value: `${hero.areaValue} ${copy.specArea}` },
    { label: copy.floorsLabel, value: hero.floorsValue },
    { label: copy.bedrooms, value: hero.bedrooms },
    { label: copy.bathrooms, value: hero.bathrooms },
  ]
  const imageUrl = hero.imageUrl && brokenImage !== hero.imageUrl ? hero.imageUrl : ''
  const mobileImageUrl = hero.mobileImageUrl && brokenImage !== hero.mobileImageUrl ? hero.mobileImageUrl : ''
  const mobileSet = mobileImageUrl ? optimizedSrcSet(mobileImageUrl, [384, 828], 45) : ''
  const desktopSet = imageUrl ? optimizedSrcSet(imageUrl, [828, 1080, 1920]) : ''
  if (mobileImageUrl) preload(optimizedSrc(mobileImageUrl, 828, 45), { as: 'image', imageSrcSet: mobileSet || undefined, imageSizes: '100vw', media: '(max-width: 480px)', fetchPriority: 'high' })
  if (imageUrl) preload(optimizedSrc(imageUrl, 1920), { as: 'image', imageSrcSet: desktopSet || undefined, imageSizes: '100vw', media: mobileImageUrl ? '(min-width: 481px)' : undefined, fetchPriority: 'high' })
  return <>
    <picture className="project-hero__media" data-cms-block="projectHero.image">
      {/* 430px пропускает iPhone 16 Pro Max (440px): он берёт широкий кадр, и cover зумит его в крыльцо. */}
      {mobileImageUrl && <source media="(max-width: 480px)" srcSet={mobileSet || mobileImageUrl} sizes="100vw" />}
      {imageUrl && <img src={optimizedSrc(imageUrl, 1920)} srcSet={desktopSet || undefined} sizes="100vw" alt={hero.name} decoding="async" fetchPriority="high" onError={() => setBrokenImage(imageUrl)} ref={(el) => { if (el?.complete && el.naturalWidth === 0) setBrokenImage(imageUrl) }} />}
    </picture>
    <div className="project-hero__veil" />
    <div className="project-hero__stage">
      <div className="project-hero__intro" data-cms-block="projectHero.heading"><div className="project-hero__heading">
        <div className="project-hero__labels"><p className="project-hero__badge">{hero.technologyBadge}</p>{location && <p className="project-hero__location">В {location}</p>}</div>
        <h1>{head}{mark ? <span>{mark}</span> : null}{tail}</h1>
      </div></div>
      <div className="project-hero__bar" data-cms-block="projectHero.specs"><ul className="project-hero__specs">{specs.map(spec => <li key={spec.label}><p>{spec.label}</p><strong>{spec.value}</strong></li>)}</ul>
        <button type="button" className="btn btn-yellow project-hero__question" onClick={() => setAskOpen(true)}>{copy.askQuestion}</button>
        {payment}
      </div>
    </div>
    {askOpen ? <LeadDialog withMessage formId="header-question" meta={{ pageTitle: document.title, project: hero.name }} onClose={() => setAskOpen(false)} /> : null}
  </>
}
