'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
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
import { recordSessionView } from '../lib/project-view'
import type { CatalogProject } from '../lib/catalog/types'

/**
 * Лайк один на устройство и проект. Шеринг считается каждый успешный раз.
 */
export type ProjectStats = { likes: number; shares: number }

function deviceSignals() {
  return {
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screen: `${window.screen.width}x${window.screen.height}x${window.devicePixelRatio || 1}`,
    lang: navigator.language,
    cores: navigator.hardwareConcurrency,
  }
}

async function sendReaction(slug: string, action: 'like' | 'unlike' | 'share') {
  const response = await fetch('/api/reactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, action, signals: deviceSignals() }),
  })
  if (!response.ok) return null
  return response.json() as Promise<ProjectStats & { already?: boolean; liked?: boolean }>
}

export function ProjectActions({
  project,
  stats,
  liked = false,
}: {
  project: CatalogProject
  stats: ProjectStats
  liked?: boolean
}) {
  const { openConsentSettings } = useConsent()
  const [counts, setCounts] = useState(stats)
  const [pressed, setPressed] = useState(liked)
  const favorites = useSyncExternalStore(
    subscribeFavorites,
    readFavorites,
    readServerFavorites,
  )
  const favorite = favorites.includes(project.id)

  useEffect(() => { void recordSessionView(project.slug) }, [project.slug])

  async function onFavorite() {
    if (!canPersistFunctional()) {
      openConsentSettings()
      return
    }
    const removing = pressed
    setPressed(!removing)
    if (favorite === removing) toggleFavorite(project.id)
    setCounts((current) => ({ ...current, likes: Math.max(0, current.likes + (removing ? -1 : 1)) }))
    const result = await sendReaction(project.slug, removing ? 'unlike' : 'like')
    if (!result) {
      setPressed(removing)
      if (favorite === removing) toggleFavorite(project.id)
      setCounts((current) => ({ ...current, likes: Math.max(0, current.likes + (removing ? 1 : -1)) }))
      return
    }
    setCounts({ likes: result.likes, shares: result.shares })
    setPressed(removing ? false : true)
    if (!removing) void recordSessionView(project.slug)
  }

  async function onShare() {
    const shared = await shareProject(project)
    if (!shared) return
    setCounts((current) => ({ ...current, shares: current.shares + 1 }))
    const result = await sendReaction(project.slug, 'share')
    if (!result) {
      setCounts((current) => ({ ...current, shares: Math.max(0, current.shares - 1) }))
      return
    }
    setCounts({ likes: result.likes, shares: result.shares })
    void recordSessionView(project.slug)
  }

  return (
    <div className="project-actions">
      <button
        type="button"
        className="project-actions__btn"
        aria-label={favorite ? copy.favoriteRemove : copy.favoriteAdd}
        aria-pressed={pressed}
        onClick={() => void onFavorite()}
      >
        <IconHeart
          size={26}
          stroke={1.6}
          fill={pressed ? 'currentColor' : 'none'}
          aria-hidden="true"
        />
        <span>{counts.likes}</span>
      </button>
      <button
        type="button"
        className="project-actions__btn"
        aria-label={copy.share}
        onClick={() => void onShare()}
      >
        <IconShare3 size={26} stroke={1.6} aria-hidden="true" />
        <span>{counts.shares}</span>
      </button>
    </div>
  )
}
