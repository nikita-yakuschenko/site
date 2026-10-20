'use client'
import { useRegionCode } from './region-bootstrap'

import { useState, useSyncExternalStore } from 'react'
import { IconBath, IconBed, IconHeart, IconRulerMeasure, IconShare3, IconStairs } from '@tabler/icons-react'
import { copy } from '../lib/copy'
import {
  readFavorites,
  readServerFavorites,
  subscribeFavorites,
  toggleFavorite,
} from '../lib/favorites'
import { shareProject } from '../lib/share'
import { recordCardShare, recordSessionView } from '../lib/project-view'
import { optimizedSrc } from '../lib/media'
import type { CatalogProject } from '../lib/catalog/types'

export function ProjectCard({ project, showPrice = true, locationLabel }: { project: CatalogProject; showPrice?: boolean; locationLabel?: string }) {
  const region = useRegionCode()
  const price = project.regionalPrices?.[region]
  const priceLabel = project.regionalPrices && !project.readyHome ? (price && price > 0 ? `от ${price.toLocaleString('ru-RU')} руб.` : 'Цена уточняется') : project.priceLabel
  // Подписка на внешнее хранилище вместо синхронизации через эффект.
  const favorites = useSyncExternalStore(subscribeFavorites, readFavorites, readServerFavorites)
  const favorite = favorites.includes(project.id)

  // Состояние загрузки привязано к конкретному адресу картинки, поэтому при
  // смене проекта сбрасывается само, без эффекта.
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null)
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const imageLoaded = loadedUrl !== null && loadedUrl === project.imageUrl
  const imageMissing = !project.imageUrl || failedUrl === project.imageUrl

  const specs = [
    { icon: IconRulerMeasure, label: `${project.area} ${copy.specArea}` },
    { icon: IconStairs, label: `${project.floors} ${copy.specFloors}` },
    { icon: IconBed, label: `${project.bedrooms} ${copy.specBed}` },
    { icon: IconBath, label: `${project.bathrooms} ${copy.specBath}` },
  ]

  const badge = project.readyHome ? copy.readyOnly : project.technologyBadge
  return (
    <article className="card">
      <div className="card__top">
        <a href={project.href} className="card__media" aria-label={badge ? `${project.name}. ${badge}` : project.name}>
          {imageMissing ? (
            <span className="card__empty">{copy.noPhoto}</span>
          ) : (
            <img
              src={optimizedSrc(project.imageUrl, 640)}
              alt=""
              loading="lazy"
              decoding="async"
              className={imageLoaded ? 'is-loaded' : ''}
              onLoad={() => setLoadedUrl(project.imageUrl)}
              onError={() => setFailedUrl(project.imageUrl)}
              ref={(el) => {
                if (!el?.complete) return
                if (el.naturalWidth > 0) setLoadedUrl(project.imageUrl)
                else setFailedUrl(project.imageUrl)
              }}
            />
          )}
          <span className="badge">
            {badge}
          </span>
        </a>
        <div className="card__actions">
          <button type="button" className="icon-btn" aria-label={copy.share} onClick={() => void shareProject(project).then(shared => { if (shared) return recordCardShare(project.slug) })}>
            <IconShare3 size={16} stroke={1.75} />
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label={favorite ? copy.favoriteRemove : copy.favoriteAdd}
            aria-pressed={favorite}
            onClick={() => { const next = toggleFavorite(project.id); if (!favorite && next.includes(project.id)) void recordSessionView(project.slug) }}
          >
            <IconHeart size={16} fill={favorite ? 'currentColor' : 'none'} className={favorite ? 'is-fav' : undefined} />
          </button>
        </div>
      </div>
      <div className="card__body">
        <div className="card__line">
          {locationLabel ? <div className="card__heading">
            <a className="card__title-link" href={project.href}><h3>{project.name}</h3></a>
            <span className="card__location-badge" aria-label={`Выставочная площадка: ${locationLabel}`}>{locationLabel}</span>
          </div> : <a className="card__title-link" href={project.href}>
            <h3>{project.name}</h3>
          </a>}
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
        </div>
        <div className="card__line">
          {showPrice && <p className="price">{priceLabel}</p>}
          <a className="btn btn-yellow card__cta" href={project.href}>
            {project.readyHome ? copy.viewReadyHome : copy.viewProject}
          </a>
        </div>
      </div>
    </article>
  )
}
