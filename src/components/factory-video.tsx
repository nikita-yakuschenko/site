'use client'

import { useState } from 'react'
import { copy } from '../lib/copy'
import { optimizedSrc } from '../lib/media'
import { VideoLightbox } from './video-lightbox'

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
  const [open, setOpen] = useState(false)

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
            <source media="(min-width: 900px)" srcSet={optimizedSrc(src, 1080)} />
            <img src={optimizedSrc(srcMobile, 828, 60)} alt={alt} loading="lazy" decoding="async" />
          </picture>
        ) : (
          <img src={optimizedSrc(src, 1080)} alt={alt} loading="lazy" decoding="async" />
        )}
        {/* В плашке кадр из самого ролика, а не отвлечённый значок: по нему
            видно, что там внутри, ещё до нажатия. Значок воспроизведения
            лежит поверх кадра — иначе кадр не отличить от фотографии. */}
        <span className="factory-video__card">
          <span className="factory-video__thumb">
            <img src={optimizedSrc('/production/video-thumb.jpg', 384, 60)} alt="" width={182} height={137} loading="lazy" />
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
      {/* Окно ролика — общий VideoLightbox, тот же, что у отзывов и
          обзоров. Прежде здесь лежала его дословная копия: своя
          блокировка прокрутки, свой Escape, своя проверка согласия. */}
      {open ? (
        <VideoLightbox
          title={copy.factoryVideoTitle}
          embedSrc={KINESCOPE_EMBED}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  )
}
