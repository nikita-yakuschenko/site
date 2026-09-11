'use client'

import { useState, useSyncExternalStore } from 'react'
import { IconBath, IconBed, IconHeart, IconRulerMeasure, IconShare3, IconStairs } from '@tabler/icons-react'
import { copy } from '../lib/copy'
import {
  readFavorites,
  readServerFavorites,
  subscribeFavorites,
  toggleFavorite,
} from '../lib/favorites'
import type { CatalogProject } from '../lib/catalog/types'

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

export function ProjectCard({ project }: { project: CatalogProject }) {
  // Подписка на внешнее хранилище вместо синхронизации через эффект.
  const favorites = useSyncExternalStore(subscribeFavorites, readFavorites, readServerFavorites)
  const favorite = favorites.includes(project.id)

  // Состояние загрузки привязано к конкретному адресу картинки, поэтому при
  // смене проекта сбрасывается само, без эффекта.
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null)
  const imageLoaded = loadedUrl !== null && loadedUrl === project.imageUrl

  const specs = [
    { icon: IconRulerMeasure, label: `${project.area} ${copy.specArea}` },
    { icon: IconStairs, label: `${project.floors} ${copy.specFloors}` },
    { icon: IconBed, label: `${project.bedrooms} ${copy.specBed}` },
    { icon: IconBath, label: `${project.bathrooms} ${copy.specBath}` },
  ]

  return (
    <article className="card">
      <div className="card__top">
        <a href={project.href} className="card__media" aria-label={project.name}>
          {project.imageUrl ? (
            <img
              src={project.imageUrl}
              alt=""
              loading="lazy"
              decoding="async"
              className={imageLoaded ? 'is-loaded' : ''}
              onLoad={() => setLoadedUrl(project.imageUrl ?? null)}
              ref={(el) => {
                if (el?.complete && el.naturalWidth > 0) setLoadedUrl(project.imageUrl ?? null)
              }}
            />
          ) : (
            <span className="card__empty">{copy.noPhoto}</span>
          )}
          <span className="badge">{project.technologyBadge}</span>
        </a>
        <div className="card__actions">
          <button type="button" className="icon-btn" aria-label={copy.share} onClick={() => void shareProject(project)}>
            <IconShare3 size={16} stroke={1.75} />
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label={favorite ? copy.favoriteRemove : copy.favoriteAdd}
            aria-pressed={favorite}
            onClick={() => toggleFavorite(project.id)}
          >
            <IconHeart size={16} fill={favorite ? 'currentColor' : 'none'} className={favorite ? 'is-fav' : undefined} />
          </button>
        </div>
      </div>
      <div className="card__body">
        <a href={project.href}>
          <h3>{project.name}</h3>
        </a>
        <ul className="specs">
          {specs.map((spec) => {
            const Icon = spec.icon
            return (
              <li key={spec.label}>
                <Icon size={16} stroke={1.75} />
                <span>{spec.label}</span>
              </li>
            )
          })}
        </ul>
        <p className="price">{project.priceLabel}</p>
        <a className="btn btn-yellow card__cta" href={project.href}>
          {copy.viewProject}
        </a>
      </div>
    </article>
  )
}
