'use client'

import { useEffect, useState } from 'react'
import { IconBath, IconBed, IconHeart, IconRulerMeasure, IconShare3, IconStairs } from '@tabler/icons-react'
import { copy } from '../lib/copy'
import { readFavorites, toggleFavorite } from '../lib/favorites'
import type { CatalogProject } from '../lib/catalog/types'

async function shareProject(project: CatalogProject): Promise<void> {
  const url = new URL(project.href, window.location.origin).href
  const payload = { title: project.name, text: project.name, url }
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

export function ProjectCard({ project }: { project: CatalogProject }) {
  const [favorite, setFavorite] = useState(false)

  useEffect(() => {
    setFavorite(readFavorites().includes(project.id))
  }, [project.id])

  return (
    <article className="card">
      <a href={project.href} className="card__media">
        <img src={project.imageUrl} alt="" />
        <span className="badge">{project.technologyBadge}</span>
      </a>
      <div className="card__actions">
        <button
          type="button"
          className="icon-btn"
          aria-label={copy.share}
          onClick={() => void shareProject(project)}
        >
          <IconShare3 size={18} />
        </button>
        <button
          type="button"
          className="icon-btn"
          aria-label={favorite ? copy.favoriteRemove : copy.favoriteAdd}
          aria-pressed={favorite}
          onClick={() => setFavorite(toggleFavorite(project.id).includes(project.id))}
        >
          <IconHeart size={18} fill={favorite ? 'currentColor' : 'none'} />
        </button>
      </div>
      <div className="card__body">
        <h3>{project.name}</h3>
        <ul className="specs">
          <li>
            <IconRulerMeasure size={16} /> {project.area}
          </li>
          <li>
            <IconStairs size={16} /> {project.floors}
          </li>
          <li>
            <IconBed size={16} /> {project.bedrooms}
          </li>
          <li>
            <IconBath size={16} /> {project.bathrooms}
          </li>
        </ul>
        <p className="price">{project.priceLabel}</p>
        <a className="btn btn-yellow" href={project.href}>
          {copy.viewProject}
        </a>
      </div>
    </article>
  )
}
