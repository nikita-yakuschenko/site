'use client'

import { useSyncExternalStore } from 'react'
import { IconHeart, IconShare3 } from '@tabler/icons-react'
import { useConsent } from '../consent/ConsentProvider'
import { canPersistFunctional } from '../consent/functional-persist'
import { copy } from '../lib/copy'
import {
  readFavorites,
  readServerFavorites,
  subscribeFavorites,
  toggleFavorite,
} from '../lib/favorites'
import { shareProject } from '../lib/share'
import type { CatalogProject } from '../lib/catalog/types'

/**
 * Избранное и «поделиться» в карточке проекта.
 *
 * Числа рядом с иконками — счётчики записанных действий. Хранилища у них
 * пока нет: избранное живёт в localStorage и приватно для браузера, а
 * репосты никто не считает. Поэтому счётчики честно показывают ноль и
 * оживут, когда появится общее хранилище.
 */
export type ProjectStats = { likes: number; shares: number }

export function ProjectActions({
  project,
  stats,
}: {
  project: CatalogProject
  stats: ProjectStats
}) {
  const { openConsentSettings } = useConsent()
  const favorites = useSyncExternalStore(
    subscribeFavorites,
    readFavorites,
    readServerFavorites,
  )
  const favorite = favorites.includes(project.id)

  function onFavorite() {
    if (!canPersistFunctional()) {
      openConsentSettings()
      return
    }
    toggleFavorite(project.id)
  }

  return (
    <div className="project-actions">
      <button
        type="button"
        className="project-actions__btn"
        aria-label={favorite ? copy.favoriteRemove : copy.favoriteAdd}
        aria-pressed={favorite}
        onClick={onFavorite}
      >
        <IconHeart
          size={26}
          stroke={1.6}
          fill={favorite ? 'currentColor' : 'none'}
          aria-hidden="true"
        />
        <span>{stats.likes + (favorite ? 1 : 0)}</span>
      </button>
      <button
        type="button"
        className="project-actions__btn"
        aria-label={copy.share}
        onClick={() => void shareProject(project)}
      >
        <IconShare3 size={26} stroke={1.6} aria-hidden="true" />
        <span>{stats.shares}</span>
      </button>
    </div>
  )
}
