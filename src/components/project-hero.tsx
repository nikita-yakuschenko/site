'use client'

import { useEffect, useState } from 'react'
import {
  IconBath,
  IconBed,
  IconChevronLeft,
  IconHeart,
  IconRulerMeasure,
  IconShare3,
  IconStairs,
} from '@tabler/icons-react'
import { copy } from '../lib/copy'
import { readFavorites, toggleFavorite } from '../lib/favorites'
import type { CatalogProject } from '../lib/catalog/types'
import { splitProjectName } from '../lib/media'

async function shareProject(project: CatalogProject): Promise<void> {
  const url = new URL(project.href, window.location.origin).href
  const payload = { title: project.name, text: `Проект «${project.name}»`, url }
  try {
    if (typeof navigator.share === 'function') {
      await navigator.share(payload)
      return
    }
    await navigator.clipboard.writeText(url)
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return
    try {
      await navigator.clipboard.writeText(url)
    } catch (clipboardError) {
      console.error(clipboardError)
    }
  }
}

export function ProjectHero({
  project,
  title,
}: {
  project: CatalogProject
  title: string
}) {
  const [favorite, setFavorite] = useState(false)
  const { text, digits } = splitProjectName(title)

  useEffect(() => {
    setFavorite(readFavorites().includes(project.id))
  }, [project.id])

  const specs = [
    { icon: IconRulerMeasure, label: copy.area, value: `${project.area} ${copy.specArea}` },
    { icon: IconStairs, label: copy.floorsLabel, value: project.floors },
    { icon: IconBed, label: copy.bedrooms, value: project.bedrooms },
    { icon: IconBath, label: copy.bathrooms, value: project.bathrooms },
  ]

  return (
    <section className="project-hero">
      <img src={project.imageUrl} alt="" />
      <div className="project-hero__veil" />
      <div className="project-hero__stage">
        <div className="project-hero__intro">
          <nav className="project-hero__crumbs" aria-label={copy.crumbsAria}>
            <a href="/projects">
              <IconChevronLeft size={16} stroke={2} />
              {copy.breadcrumbsCatalog}
            </a>
            <span>/</span>
            <span>{title}</span>
          </nav>
          <p className="project-hero__badge">{project.technologyBadge}</p>
          <h1>
            {text} {digits ? <span>{digits}</span> : null}
          </h1>
        </div>

        <div className="project-hero__bar">
          <ul className="project-hero__specs">
            {specs.map((spec) => {
              const Icon = spec.icon
              return (
                <li key={spec.label}>
                  <Icon size={22} stroke={1.75} />
                  <div>
                    <p>{spec.label}</p>
                    <strong>{spec.value}</strong>
                  </div>
                </li>
              )
            })}
          </ul>
          <div className="project-hero__aside">
            <div className="project-hero__price">
              <p>{copy.cost}</p>
              <strong>{project.priceLabel}</strong>
            </div>
            <a className="btn btn-yellow project-hero__cta" href="#lead">
              {copy.getQuote}
            </a>
            <button type="button" className="project-hero__icon" aria-label={copy.share} onClick={() => void shareProject(project)}>
              <IconShare3 size={18} stroke={1.75} />
            </button>
            <button
              type="button"
              className="project-hero__icon"
              aria-label={favorite ? copy.favoriteRemove : copy.favoriteAdd}
              aria-pressed={favorite}
              onClick={() => setFavorite(toggleFavorite(project.id).includes(project.id))}
            >
              <IconHeart size={18} fill={favorite ? 'currentColor' : 'none'} />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
