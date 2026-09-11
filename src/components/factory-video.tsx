'use client'

import { useEffect, useId, useState } from 'react'
import { copy } from '../lib/copy'

const KINESCOPE_EMBED = 'https://kinescope.io/embed/npS4zk5fgxhM7XbFGRkoq7?autoplay=1&muted=0'

export function FactoryVideo({ src = '/fixtures/factory.jpg', alt = copy.factoryAlt }: { src?: string; alt?: string }) {
  const [open, setOpen] = useState(false)
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <>
      <button type="button" className="factory-video" onClick={() => setOpen(true)}>
        <img src={src} alt={alt} />
        <span className="factory-video__card">
          <img src="/fixtures/play-circle.svg" alt="" />
          <span>
            <strong>{copy.factoryWatchLabel}</strong>
            <em>{copy.factoryWatch}</em>
          </span>
        </span>
      </button>
      {open ? (
        <div className="lightbox" role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={() => setOpen(false)}>
          <div className="factory-video__modal" onClick={(event) => event.stopPropagation()}>
            <div className="factory-video__modal-bar">
              <p id={titleId}>{copy.factoryVideoTitle}</p>
              <button type="button" className="lightbox__close" onClick={() => setOpen(false)}>
                {copy.close}
              </button>
            </div>
            <iframe title={copy.factoryVideoTitle} src={KINESCOPE_EMBED} allow="autoplay; fullscreen" allowFullScreen />
          </div>
        </div>
      ) : null}
    </>
  )
}
