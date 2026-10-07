'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { PhotoLightbox } from './photo-lightbox'
import { HistoryPhotoCarousel } from './history-photo-carousel'
import { IconArrowLeft, IconArrowRight, IconArrowUpRight, IconPhoto } from '@tabler/icons-react'

type HistoryBlocks = readonly [readonly [string, string]] | readonly [readonly [string, string], readonly [string, string]] | readonly [readonly [string, string], readonly [string, string], readonly [string, string]] | readonly [readonly [string, string], readonly [string, string], readonly [string, string], readonly [string, string]]
type EventLogo = { src: string; alt: string; width: number; height: number; edition?: string }
export type HistoryEntry = { year: string; events: HistoryBlocks; eventLogos?: readonly (EventLogo | readonly EventLogo[] | null)[]; links?: readonly string[]; linkWords?: readonly string[]; images?: readonly string[]; imageAlt?: string; imageFit?: 'cover' | 'contain'; imagePosition?: string; logo?: boolean; stacked?: boolean; bankLogos?: readonly { src: string; alt: string; width?: number; height?: number }[] }

export function AboutTimeline({ entries }: { entries: readonly HistoryEntry[] }) {
  const rail = useRef<HTMLDivElement>(null)
  const scale = useRef<HTMLElement>(null)
  const [active, setActive] = useState(0)
  const [gallery, setGallery] = useState<{ entry: number; index: number } | null>(null)
  const galleryImages = gallery ? entries[gallery.entry]?.images : undefined

  const [edges, setEdges] = useState({ start: true, end: false })

  useEffect(() => {
    const element = scale.current
    if (!element) return
    const revealActiveYear = () => {
      const button = element.querySelector<HTMLButtonElement>('button[aria-current]')
      if (!button || !element.clientWidth) return
      const viewport = element.getBoundingClientRect()
      const target = button.getBoundingClientRect()
      const offset = target.left < viewport.left + 8
        ? target.left - viewport.left - 8
        : target.right > viewport.right - 8
          ? target.right - viewport.right + 8
          : 0
      if (offset) element.scrollTo({ left: element.scrollLeft + offset, behavior: 'instant' })
    }
    revealActiveYear()
    const observer = new ResizeObserver(revealActiveYear)
    observer.observe(element)
    return () => observer.disconnect()
  }, [active])

  useEffect(() => {
    const element = rail.current
    if (!element) return
    const update = () => {
      // Off-screen sections can temporarily have no measurable layout.
      // Keep the last valid year instead of storing NaN and disabling both arrows.
      if (element.clientWidth <= 0 || element.scrollWidth <= 0) return
      const index = Math.max(0, Math.min(entries.length - 1, Math.round(element.scrollLeft / element.clientWidth)))
      const start = index === 0
      const end = index === entries.length - 1
      setActive(index)
      element.dataset.start = String(start)
      element.dataset.end = String(end)
      setEdges(previous => previous.start === start && previous.end === end ? previous : { start, end })
    }
    update()
    element.addEventListener('scroll', update, { passive: true })
    const visibility = new IntersectionObserver(update)
    visibility.observe(element)
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => {
      element.removeEventListener('scroll', update)
      observer.disconnect()
      visibility.disconnect()
    }
  }, [entries.length])

  function goTo(index: number) {
    const element = rail.current
    if (!element) return
    element.scrollTo({ left: index * element.clientWidth, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  }

  function move(direction: number) {
    const element = rail.current
    if (!element) return
    const step = element.querySelector('li')?.getBoundingClientRect().width ?? element.clientWidth
    const index = direction > 0 ? Math.floor((element.scrollLeft + 2) / step) + 1 : Math.ceil((element.scrollLeft - 2) / step) - 1
    element.scrollTo({ left: Math.max(0, Math.min(element.scrollWidth - element.clientWidth, index * step)), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  }

  return (
    <>
      <div className="about-timeline__heading">
        <h2 id="about-history"><span className="about-timeline__title">История компании</span> <span className="about-timeline__year" aria-live="polite">{entries[active]?.year}</span></h2>
        <div className="about-timeline__controls">
          <button type="button" aria-label="Предыдущие годы" aria-controls="about-history-rail" disabled={edges.start} onClick={() => move(-1)}><IconArrowLeft size={18} stroke={2} aria-hidden /></button>
          <button type="button" aria-label="Следующие годы" aria-controls="about-history-rail" disabled={edges.end} onClick={() => move(1)}><IconArrowRight size={18} stroke={2} aria-hidden /></button>
        </div>
      </div>
      <nav ref={scale} className="about-timeline__scale" aria-label="Выбрать год истории компании">
        {entries.map((entry, index) => <button key={entry.year} type="button" aria-current={index === active ? 'date' : undefined} aria-controls="about-history-rail" onClick={() => goTo(index)}><span className="about-timeline__tick" aria-hidden /><span>{entry.year}</span></button>)}
      </nav>
      <div ref={rail} id="about-history-rail" className="about-timeline__rail" tabIndex={0} role="region" aria-labelledby="about-history">
        <ol className="about-history">{entries.map((entry, entryIndex) => (
          <li className="about-history__year" key={entry.year} aria-label={entry.year}>
            <div className="about-history__layout about-history__layout--media">
              <ul className={`about-history__blocks${entry.stacked ? ' about-history__blocks--stacked' : ''}`}>{entry.events.map(([, text], pointIndex) => {
                const word = entry.linkWords?.[pointIndex]
                const href = entry.links?.[pointIndex]
                const position = word ? text.indexOf(word) : -1
                const eventLogo = entry.eventLogos?.[pointIndex]
                const eventLogos: readonly EventLogo[] = eventLogo ? ('src' in eventLogo ? [eventLogo] : eventLogo) : []
                return <li className="about-history__point" key={text}><p>{word && href && position >= 0 ? <>{text.slice(0, position)}<Link className="about-history__inline-link" href={href} tabIndex={entryIndex === active ? 0 : -1}>{word}<IconArrowUpRight size={16} stroke={2} aria-hidden /></Link>{text.slice(position + word.length)}</> : text}</p>{eventLogos.length ? <div className="about-history__event-logos">{eventLogos.map(logo => <span className="about-history__event-brand" key={logo.src}><Image className={`about-history__event-logo${(logo.src.includes("/banks/") || logo.src.endsWith("-compact.svg")) ? " about-history__event-logo--bank" : ""}`} key={logo.src} src={logo.src} alt={logo.alt} width={logo.width} height={logo.height} />{logo.src.endsWith("/open_village.svg") ? <span className="about-history__event-edition">’{logo.edition ?? entry.year.slice(-2)}</span> : null}</span>)}</div> : null}</li>
              })}</ul>
              {entry.bankLogos?.length ? <div className="about-history__preview about-history__preview--banks">{entry.bankLogos.map(bank => <div className={`about-history__bank${(bank.src.endsWith('/keb.svg') || bank.src.endsWith('/domrf.svg')) ? ' about-history__bank--keb' : ''}`} key={bank.src}><Image src={bank.src} alt={bank.alt} width={bank.width ?? (bank.src.endsWith('/rsb.svg') ? 1646 : bank.src.endsWith('/sber.svg') ? 576 : 800)} height={bank.height ?? (bank.src.endsWith('/rsb.svg') ? 299 : 100)} />{(bank.src.endsWith('/keb.svg') || bank.src.endsWith('/domrf.svg')) ? <Image className="about-history__bank-mono" src={bank.src.endsWith('/domrf.svg') ? '/img/about/domrf-mono.svg' : '/img/about/keb-mono.svg'} alt="" aria-hidden width={bank.width ?? 800} height={100} /> : null}</div>)}</div> : entry.logo ? <div className="about-history__preview about-history__preview--logo"><span className="about-history__logo" role="img" aria-label="Авангард Строй" /></div> : entry.images?.length ? <HistoryPhotoCarousel images={entry.images} alt={entry.imageAlt ?? `История компании: ${entry.year}`} fit={entry.imageFit} position={entry.imagePosition} active={entryIndex === active && !gallery} onOpen={index => setGallery({ entry: entryIndex, index })} /> : entry.eventLogos ? null : <div className="about-history__preview about-history__preview--empty" role="img" aria-label={`Место для фотографии или галереи за ${entry.year} год`}><IconPhoto size={32} stroke={1.5} aria-hidden /><span>Фото или галерея</span></div>}
            </div>
          </li>
        ))}</ol>
      </div>
      {gallery && galleryImages ? <PhotoLightbox backdrop="form" images={galleryImages} index={gallery.index} onIndex={index => setGallery({ ...gallery, index })} onClose={() => setGallery(null)} /> : null}
    </>
  )
}
