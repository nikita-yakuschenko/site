'use client'

import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
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

function LovePromptShape() {
  const pencilId = useId()
  const ref = useRef<SVGSVGElement>(null)
  const [size, setSize] = useState({ width: 340, height: 222, tab: 160, tipX: 296, tipY: 49 })
  useEffect(() => {
    const card = ref.current?.parentElement
    const actions = card?.parentElement
    if (!card || !actions) return
    const measure = () => {
      const icon = actions.querySelector(':scope > .project-actions__btn:last-child svg')?.getBoundingClientRect()
      const box = card.getBoundingClientRect()
      setSize({ width: card.clientWidth, height: card.clientHeight, tab: actions.clientWidth + 20,
        tipX: icon ? icon.left + icon.width / 2 - box.left : 296,
        tipY: actions.offsetHeight - card.offsetTop + 8 })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(card)
    observer.observe(actions)
    return () => observer.disconnect()
  }, [])
  const { width: w, height: h, tab, tipX: x, tipY: y } = size
  const join = w - tab
  // A 30px outer radius follows the 20px pill radius with a 10px white rim.
  // The concave 20px fillet is tangent to both the horizontal edge and
  // the 30px capsule arc: their circle centers are exactly 50px apart.
  const contour = `M20 20H${join - 10}A20 20 0 0 0 ${join + 6} 12A30 30 0 0 1 ${join + 30} 0H${w - 30}A30 30 0 0 1 ${w} 30V${h - 20}A20 20 0 0 1 ${w - 20} ${h}H20A20 20 0 0 1 0 ${h - 20}V40A20 20 0 0 1 20 20Z`
  const arrow = `M${x - 29} ${y + 70}C${x + 3} ${y + 55} ${x + 7} ${y + 30} ${x} ${y}M${x - 5} ${y + 12}L${x} ${y}L${x + 9} ${y + 9}`
  return <>
    <svg ref={ref} className="project-love__shape" viewBox={`0 0 ${w} ${h}`} aria-hidden="true"><path d={contour} fill="white" /></svg>
    <svg className="project-love__arrow" viewBox={`0 0 ${w} ${h}`} fill="none" aria-hidden="true">
      <defs><filter id={pencilId} x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="3" seed="7" result="grain" /><feDisplacementMap in="SourceGraphic" in2="grain" scale=".8" xChannelSelector="R" yChannelSelector="G" /></filter></defs>
      <path d={arrow} stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity=".82" filter={`url(#${pencilId})`} />
      <path d={`M${x - 28} ${y + 71}C${x + 1} ${y + 57} ${x + 9} ${y + 29} ${x + .8} ${y + 1}`} stroke="currentColor" strokeWidth=".8" strokeLinecap="round" opacity=".55" />
    </svg>
  </>
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
  useEffect(() => {
    if (!loveColor) return
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !actionsRef.current?.contains(event.target)) setLoveColor(null)
    }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setLoveColor(null) }
    const timer = window.setTimeout(() => setLoveColor(null), 10_000)
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => {
      window.clearTimeout(timer)
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
      setLoveColor(['ink', 'red', 'yellow'][Math.floor(Math.random() * 3)] ?? 'ink')
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
          <LovePromptShape />
          <button type="button" className="project-love__close" aria-label="Закрыть подсказку" onClick={() => setLoveColor(null)}><IconX size={16} /></button>
          <p className="project-love__title" role="status">Кажется, это любовь <IconHeart className={`project-love__heart project-love__heart--${loveColor}`} size={21} fill="currentColor" stroke={1.5} aria-hidden="true" /></p>
          <div className="project-love__body">
            <Image src="/img/ui/like-love-cat-v3.webp" alt="Улыбающийся котик с чашкой" width={136} height={124} className="project-love__cat" />
            <p>Поделись с&nbsp;тем, с&nbsp;кем вместе мечтаешь о&nbsp;своём доме</p>
          </div>
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
