'use client'

import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import type { JournalFeedFilters, JournalFeedPage } from './content'
import { StoryCard } from './story-card'
import { JournalFeedOffer } from './journal-feed-offer'

const OFFER_GAPS = [8, 10, 9] as const

export function JournalFeed({ filters, firstPage, offerOffset }: { filters: JournalFeedFilters; firstPage: JournalFeedPage; offerOffset?: number }) {
  const [page, setPage] = useState(firstPage)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const marker = useRef<HTMLDivElement>(null)
  const pending = useRef<AbortController | null>(null)

  useEffect(() => () => pending.current?.abort(), [])

  const loadMore = useCallback(async () => {
    if (!page.next || pending.current) return
    const controller = new AbortController()
    pending.current = controller
    setLoading(true)
    setFailed(false)
    const params = new URLSearchParams({ after: page.next })
    if (filters.topic) params.set('topic', filters.topic)
    if (filters.query) params.set('q', filters.query)
    if (filters.videoOnly) params.set('format', 'video')

    try {
      const response = await fetch(`/api/journal/feed?${params}`, { signal: controller.signal })
      if (!response.ok) throw new Error('Journal feed request failed')
      const nextPage: JournalFeedPage = await response.json()
      setPage(current => {
        const loaded = new Set(current.items.map(item => item.story.slug))
        return { items: [...current.items, ...nextPage.items.filter(item => !loaded.has(item.story.slug))], next: nextPage.next }
      })
    } catch {
      if (!controller.signal.aborted) setFailed(true)
    } finally {
      pending.current = null
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [filters, page.next])

  useEffect(() => {
    if (!marker.current || !page.next || failed || loading) return
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) void loadMore()
    }, { rootMargin: '320px 0px' })
    observer.observe(marker.current)
    return () => observer.disconnect()
  }, [failed, loadMore, loading, page.next])

  const offers = new Map<number, number>()
  if (offerOffset !== undefined) {
    const lastPosition = offerOffset + page.items.length - (page.next ? 0 : 1)
    for (let position = 0, index = 0; position < lastPosition; index++) {
      position += OFFER_GAPS[index % OFFER_GAPS.length]!
      if (position <= lastPosition) offers.set(position, index)
    }
  }
  return <>
    <div className="journal-feed">{page.items.map(({ story, reactions }, index) => {
      const offerIndex = offers.get(index + (offerOffset ?? 0) + 1)
      return <Fragment key={story.slug}>
        <StoryCard story={story} reactions={reactions} />
        {offerIndex !== undefined && <JournalFeedOffer index={offerIndex} />}
      </Fragment>
    })}</div>
    {page.next && <div ref={marker} className="journal-feed-loader">
      {failed
        ? <button type="button" className="btn" onClick={() => void loadMore()}>Повторить загрузку</button>
        : <span role="status">{loading ? 'Загружаем публикации…' : ''}</span>}
    </div>}
  </>
}
