'use client'

import { useState } from 'react'
import { copy } from '../lib/copy'
import { resizedSrc, resizedSrcSet } from '../lib/media'
import { VideoLightbox } from './video-lightbox'

export const FACTORY_VIDEO_EMBED =
  'https://kinescope.io/embed/npS4zk5fgxhM7XbFGRkoq7?autoplay=1&muted=0'

export function FactoryVideo({
  src = '/fixtures/factory.jpg',
  srcMobile,
  alt = copy.factoryAlt,
  embedSrc = FACTORY_VIDEO_EMBED,
}: {
  src?: string
  srcMobile?: string
  alt?: string
  embedSrc?: string
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
            <source media="(min-width: 900px)" srcSet={resizedSrcSet(src, [640, 1080, 1440])} sizes="(min-width: 900px) 560px, 100vw" />
            <img src={resizedSrc(srcMobile, 828, 60)} srcSet={resizedSrcSet(srcMobile, [640, 1080], 60)} sizes="100vw" alt={alt} loading="lazy" decoding="async" />
          </picture>
        ) : (
          <img src={resizedSrc(src, 1080)} srcSet={resizedSrcSet(src, [640, 1080, 1440])} sizes="(min-width: 900px) 560px, 100vw" alt={alt} loading="lazy" decoding="async" />
        )}
        {/* В плашке кадр из самого ролика, а не отвлечённый значок: по нему
            видно, что там внутри, ещё до нажатия. Значок воспроизведения
            лежит поверх кадра — иначе кадр не отличить от фотографии. */}
        <span className="factory-video__card">
          <span className="factory-video__thumb">
            <img src={resizedSrc('/production/video-thumb.jpg', 384, 60)} alt="" width={182} height={137} loading="lazy" />
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
          embedSrc={embedSrc}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  )
}
