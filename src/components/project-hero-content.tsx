'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { splitProjectName } from '../lib/project-name'
import { copy } from '../lib/copy'
import { isProjectHeroData, type ProjectHeroData } from '../lib/catalog/project-hero-data'

export function ProjectHeroContent({ data, connected, location, payment }: { data: ProjectHeroData; connected: boolean; location?: string; payment: ReactNode }) {
  const [draft, setDraft] = useState<ProjectHeroData | null>(null)
  const hero = draft || data
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
  return <>
    <picture className="project-hero__media">
      {hero.mobileImageUrl && <source media="(max-width: 430px)" srcSet={hero.mobileImageUrl} />}
      <img src={hero.imageUrl} alt="" />
    </picture>
    <div className="project-hero__veil" />
    <div className="project-hero__stage">
      <div className="project-hero__intro"><div className="project-hero__heading">
        <div className="project-hero__labels"><p className="project-hero__badge">{hero.technologyBadge}</p>{location && <p className="project-hero__location">В {location}</p>}</div>
        <h1>{head}{mark ? <span>{mark}</span> : null}{tail}</h1>
      </div></div>
      <div className="project-hero__bar"><ul className="project-hero__specs">{specs.map(spec => <li key={spec.label}><p>{spec.label}</p><strong>{spec.value}</strong></li>)}</ul>{payment}</div>
    </div>
  </>
}
