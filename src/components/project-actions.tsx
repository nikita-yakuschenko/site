'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { IconHeart, IconShare3, IconX } from '@tabler/icons-react'
import Image from 'next/image'
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
  const [loveColor, setLoveColor] = useState<string | null>(null)
  const actionsRef = useRef<HTMLDivElement>(null)
  const reactionPending = useRef(false)
  const promptSeen = useRef(false)
  useEffect(() => {
    if (!loveColor) return
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !actionsRef.current?.contains(event.target)) setLoveColor(null)
    }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setLoveColor(null) }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', escape)
    }
  }, [loveColor])
  const favorites = useSyncExternalStore(
    subscribeFavorites,
    readFavorites,
    readServerFavorites,
  )
  const favorite = favorites.includes(project.id)

  useEffect(() => { void recordSessionView(project.slug) }, [project.slug])

  async function onFavorite() {
    if (reactionPending.current) return
    if (!canPersistFunctional()) {
      openConsentSettings()
      return
    }
    const removing = pressed
    reactionPending.current = true
    if (removing) setLoveColor(null)
    setPressed(!removing)
    if (favorite === removing) toggleFavorite(project.id)
    setCounts((current) => ({ ...current, likes: Math.max(0, current.likes + (removing ? -1 : 1)) }))
    const result = await sendReaction(project.slug, removing ? 'unlike' : 'like').catch(() => null)
    reactionPending.current = false
    if (!result) {
      setPressed(removing)
      if (favorite === removing) toggleFavorite(project.id)
      setCounts((current) => ({ ...current, likes: Math.max(0, current.likes + (removing ? 1 : -1)) }))
      return
    }
    setCounts({ likes: result.likes, shares: result.shares })
    setPressed(removing ? false : true)
    if (!removing) {
      void recordSessionView(project.slug)
      let seen = promptSeen.current
      try { seen ||= sessionStorage.getItem('avgst-love-prompt-seen') === '1' } catch {}
      if (!seen) {
        promptSeen.current = true
        try { sessionStorage.setItem('avgst-love-prompt-seen', '1') } catch {}
        setLoveColor(['ink', 'red', 'yellow'][Math.floor(Math.random() * 3)] ?? 'ink')
      }
    }
  }

  async function onShare() {
    setLoveColor(null)
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
    <div ref={actionsRef} className={`project-actions${loveColor ? ' project-actions--love' : ''}`}>
      {loveColor && (
        <aside className="project-love" aria-label="Поделиться понравившимся проектом">
          <svg className="project-love__shape" viewBox="0 0 340 240" preserveAspectRatio="none" aria-hidden="true"><path d="M20 36H166C184 36 174 0 206 0H310C328 0 340 12 340 30V220Q340 240 320 240H20Q0 240 0 220V56Q0 36 20 36Z" fill="white" /></svg>
          <button type="button" className="project-love__close" aria-label="Закрыть подсказку" onClick={() => setLoveColor(null)}><IconX size={16} /></button>
          <p className="project-love__title" role="status">Кажется, это любовь <IconHeart className={`project-love__heart project-love__heart--${loveColor}`} size={21} fill="currentColor" stroke={1.5} aria-hidden="true" /></p>
          <div className="project-love__body">
            <Image src="/img/ui/like-love-cat.webp" alt="Улыбающийся котик с чашкой" width={136} height={124} className="project-love__cat" />
            <p>Поделись с тем, с кем вместе мечтаешь о своём доме</p>
          </div>
          <svg className="project-love__arrow" viewBox="0 0 64 96" fill="none" aria-hidden="true"><path d="M12 91C48 73 49 39 37 7M37 7L33 23M37 7L48 17" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </aside>
      )}
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
