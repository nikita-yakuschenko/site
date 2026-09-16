'use client'

import { IconX } from '@tabler/icons-react'
import { useEffect, useId, useState } from 'react'
import { useConsent } from '../consent/ConsentProvider'
import { EmbedPlaceholder } from '../consent/EmbedPlaceholder'
import { copy } from '../lib/copy'

const KINESCOPE_EMBED =
  'https://kinescope.io/embed/npS4zk5fgxhM7XbFGRkoq7?autoplay=1&muted=0'

export function FactoryVideo({
  src = '/fixtures/factory.jpg',
  srcMobile,
  alt = copy.factoryAlt,
}: {
  src?: string
  srcMobile?: string
  alt?: string
}) {
  const { hasConsent } = useConsent()
  const allowed = hasConsent('functional')
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
      <button
        type="button"
        className="factory-video"
        onClick={() => setOpen(true)}
      >
        {/* На узком экране кадр вертикальный: снимок цеха снят вертикально,
            и широкая обрезка выбрасывала половину пролёта. */}
        {srcMobile ? (
          <picture>
            <source media="(min-width: 900px)" srcSet={src} />
            <img src={srcMobile} alt={alt} />
          </picture>
        ) : (
          <img src={src} alt={alt} />
        )}
        {/* В плашке кадр из самого ролика, а не отвлечённый значок: по нему
            видно, что там внутри, ещё до нажатия. Значок воспроизведения
            лежит поверх кадра — иначе кадр не отличить от фотографии. */}
        <span className="factory-video__card">
          <span className="factory-video__thumb">
            <img src="/production/video-thumb.jpg" alt="" />
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
            </svg>
          </span>
          <span className="factory-video__label">
            <strong>{copy.factoryWatchLabel}</strong>
            <em>{copy.factoryWatch}</em>
          </span>
        </span>
      </button>
      {open ? (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={() => setOpen(false)}
        >
          <div
            className="factory-video__modal"
            onClick={(event) => event.stopPropagation()}
          >
            {/* Название и крестик лежат на кадре, а не отдельной полосой
                над ним: ролик занимает всё окно, хром его не надстраивает. */}
            <div className="factory-video__overlay">
              <p id={titleId}>{copy.factoryVideoTitle}</p>
              <button
                type="button"
                className="factory-video__close"
                aria-label={copy.close}
                onClick={() => setOpen(false)}
              >
                <IconX size={20} stroke={2.2} />
              </button>
            </div>
            {allowed ? (
              <iframe
                title={copy.factoryVideoTitle}
                src={KINESCOPE_EMBED}
                allow="autoplay; fullscreen"
                allowFullScreen
              />
            ) : (
              <EmbedPlaceholder
                title={copy.factoryVideoTitle}
                message="Для просмотра видео разрешите функциональные cookie."
              />
            )}
          </div>
        </div>
      ) : null}
    </>
  )
}
