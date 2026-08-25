'use client'

import { useCallback, useEffect, useState } from 'react'
import { copy } from '../lib/copy'

export function ProjectGallery({
  title,
  images,
}: {
  title: string
  images: string[]
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const close = useCallback(() => setOpenIndex(null), [])

  useEffect(() => {
    if (openIndex == null) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') close()
      if (event.key === 'ArrowRight') setOpenIndex((i) => (i == null ? i : (i + 1) % images.length))
      if (event.key === 'ArrowLeft') setOpenIndex((i) => (i == null ? i : (i - 1 + images.length) % images.length))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openIndex, images.length, close])

  if (!images.length) return null

  return (
    <section className="section">
      <div className="section__inner">
        <h2>{title}</h2>
        <div className="gallery-grid">
          {images.map((src, index) => (
            <button key={src + index} type="button" className="gallery-grid__item" onClick={() => setOpenIndex(index)}>
              <img src={src} alt="" />
            </button>
          ))}
        </div>
      </div>
      {openIndex != null ? (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={title}>
          <button type="button" className="lightbox__close" onClick={close}>
            {copy.close}
          </button>
          <img src={images[openIndex]} alt="" />
        </div>
      ) : null}
    </section>
  )
}
