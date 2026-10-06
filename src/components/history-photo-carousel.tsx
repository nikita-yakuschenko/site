'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { CarouselProgress } from './carousel-progress'

export function HistoryPhotoCarousel({ images, alt, fit = 'cover', position = 'center', active, onOpen }: {
  images: readonly string[]; alt: string; fit?: 'cover' | 'contain'; position?: string; active: boolean; onOpen: (index: number) => void
}) {
  const root = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState(0)
  const [playId, setPlayId] = useState(0)
  const [visible, setVisible] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [portraits, setPortraits] = useState<Record<string, boolean>>({})
  const count = images.length
  const rotating = count > 1
  const index = ((pos % count) + count) % count
  const paused = !active || !visible || hovered || hidden
  const shift = (value: number) => `translate3d(${-(value + (rotating ? 1 : 0)) * 100}%, 0, 0)`
  const select = useCallback((next?: number) => {
    const real = ((pos % count) + count) % count
    const node = track.current
    if (node && real !== pos) {
      node.style.transition = 'none'
      node.style.transform = `translate3d(${-(real + 1) * 100}%, 0, 0)`
      void node.offsetWidth
      node.style.transition = ''
    }
    setPos(next ?? real + 1)
    setPlayId(value => value + 1)
  }, [pos, count])
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(Boolean(entry?.isIntersecting)), { threshold: .25 })
    if (root.current) observer.observe(root.current)
    const visibility = () => setHidden(document.hidden)
    visibility()
    document.addEventListener('visibilitychange', visibility)
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', visibility) }
  }, [])
  const lane = rotating ? [images[count - 1]!, ...images, images[0]!] : images
  return <div ref={root} className="about-history__media" onPointerEnter={event => { if (event.pointerType !== 'touch') setHovered(true) }} onPointerLeave={() => setHovered(false)} onFocusCapture={() => setHovered(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHovered(false) }}>
    <div className="about-history__photo-view">
      <div ref={track} className="hero__promos-track" style={{ transform: shift(pos) }}>
        {lane.map((src, item) => {
          const clone = rotating && (item === 0 || item === lane.length - 1)
          return <button key={item} type="button" className="about-history__preview about-history__photo-slide" aria-hidden={clone || undefined} aria-label={`Открыть ${alt}`} tabIndex={!clone && active && item === index + (rotating ? 1 : 0) ? 0 : -1} onClick={() => onOpen(index)}>
            <Image src={src} alt={clone ? '' : alt} fill style={{ objectFit: portraits[src] ? 'contain' : fit, objectPosition: position }} onLoad={event => { const image = event.currentTarget; const portrait = image.naturalHeight > image.naturalWidth; setPortraits(previous => previous[src] === portrait ? previous : { ...previous, [src]: portrait }) }} sizes="(max-width: 767px) 100vw, 33vw" />
          </button>
        })}
      </div>
    </div>
    {rotating ? <CarouselProgress className="about-history__photo-progress" labels={images.map((_, i) => `Фото ${i + 1}`)} index={index} playId={playId} paused={paused} tabIndex={active ? 0 : -1} onSelect={select} onComplete={() => select()} /> : null}
  </div>
}
