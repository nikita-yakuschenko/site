'use client'

import { useEffect, useState } from 'react'
import { IconArrowUpRight } from '@tabler/icons-react'
import { copy, projectsInSeries } from '../lib/copy'
import { isCatalogSeries, type CatalogSeries } from '../lib/catalog/types'
import type { LayoutBlock } from './block-renderer'
import { PhotoTile } from './photo-tile'

type SeriesTile = { id: string; place?: string; title: string; href: string; image: string; count?: number }
type SeriesDraft = { heading?: string; button?: string; tiles?: { title?: string; series?: string; image?: string; count?: number }[] }

const fallbackImage: Record<CatalogSeries, string> = {
  panel: '/series/panel.jpg',
  barn: '/series/barn.jpg',
  classic: '/series/classic.jpg',
  modular: '/series/modular.jpg',
}

function usePreviewSeries() {
  const [draft, setDraft] = useState<SeriesDraft | null>(null)
  useEffect(() => {
    if (window.parent === window || !new URLSearchParams(window.location.search).has('cmsPreview')) return
    const allowed = new Set(['http://localhost:3001', 'https://cms.avgst.ru'])
    const receive = (event: MessageEvent) => {
      if (event.source !== window.parent || !allowed.has(event.origin) || event.data?.type !== 'avgst:preview-series') return
      setDraft({ heading: event.data.heading, button: event.data.button, tiles: Array.isArray(event.data.tiles) ? event.data.tiles : [] })
    }
    window.addEventListener('message', receive)
    return () => window.removeEventListener('message', receive)
  }, [])
  return draft
}

export function SeriesBento({ block }: { block: LayoutBlock }) {
  const server = Array.isArray(block.items) ? (block.items as SeriesTile[]) : []
  const draft = usePreviewSeries()
  const heading = draft?.heading || String(block.heading || copy.seriesHeading)
  const button = draft?.button || String(block.catalogLabel || copy.seriesAll)
  const items = draft?.tiles?.length ? draft.tiles.map((tile, index) => {
    const series = tile.series && isCatalogSeries(tile.series) ? tile.series : 'panel'
    const current = server[index]
    return {
      id: current?.id || `slot-${index}`,
      place: current?.place || ['panel', 'barn', 'classic', 'modular'][index] || 'panel',
      title: tile.title || current?.title || '',
      href: `/catalog?series=${series}`,
      image: tile.image || fallbackImage[series],
      count: typeof tile.count === 'number' ? tile.count : 0,
    }
  }) : server
  if (!items.length) return null
  return (
    <section className="section section--muted" data-cms-block="seriesBento">
      <div className="section__inner">
        <div className="section__head" data-cms-block="seriesBento.heading">
          <div>
            {block.showEyebrow !== false ? <p className="eyebrow">{String(block.eyebrow || copy.seriesEyebrow)}</p> : null}
            <h2>{heading}</h2>
          </div>
          <a className="btn btn-yellow section__catalog-cta section__catalog-cta--desktop" href={String(block.catalogHref || '/catalog')}>
            {button}
            <IconArrowUpRight size={18} stroke={2} />
          </a>
        </div>
        <div className="series-bento" data-cms-block="seriesBento.cards">
          {items.map(item => (
            <PhotoTile
              key={item.id}
              className={`series-bento__tile--${item.place || item.id}`}
              href={item.href}
              image={item.image}
              title={item.title}
              sizes={item.place === 'panel' || item.place === 'modular'
                ? '(max-width: 719px) calc(100vw - 48px), 60vw'
                : '(max-width: 719px) calc(100vw - 48px), 30vw'}
              count={item.count != null ? projectsInSeries(item.count) : undefined}
            />
          ))}
        </div>
        <a className="btn btn-yellow section__catalog-cta section__catalog-cta--mobile" href={String(block.catalogHref || '/catalog')} data-cms-block="seriesBento.button">
          {button}
          <IconArrowUpRight size={18} stroke={2} />
        </a>
      </div>
    </section>
  )
}
