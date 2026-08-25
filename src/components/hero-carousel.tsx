'use client'

import { useEffect, useLayoutEffect, useState } from 'react'
import {
  IconArrowUpRight,
  IconHourglass,
  IconMedal,
  IconStar,
  IconUsers,
} from '@tabler/icons-react'
import { copy, nbspText } from '../lib/copy'

const ADVANTAGE_ICONS = [IconHourglass, IconUsers, IconMedal, IconStar]
const SLIDE_MS = 6000

type BannerTone = 'light' | 'dark'

function sampleHeaderBand(img: HTMLImageElement): { luma: number; whiteRatio: number } {
  const w = 64
  const h = 40
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return { luma: 0.5, whiteRatio: 0 }
  ctx.drawImage(img, 0, 0, w, h)
  const rows = Math.max(1, Math.floor(h * 0.45))
  const data = ctx.getImageData(0, 0, w, rows).data
  let sum = 0
  let count = 0
  let white = 0
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 8) continue
    const luma = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255
    sum += luma
    count += 1
    if (luma > 0.86) white += 1
  }
  return {
    luma: count ? sum / count : 0.5,
    whiteRatio: count ? white / count : 0,
  }
}

function readBannerTone(img: HTMLImageElement, hasVeil: boolean, kind: string): BannerTone {
  if (hasVeil) return 'dark'
  if (kind === 'graphic') return 'light'
  try {
    const { luma, whiteRatio } = sampleHeaderBand(img)
    return luma > 0.7 || whiteRatio > 0.5 ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

export function HeroCarousel() {
  const slides = copy.heroSlides
  const [index, setIndex] = useState(0)
  const [playId, setPlayId] = useState(0)
  const current = slides[index] || slides[0]
  const graphic = current.kind === 'graphic'

  function goTo(next: number) {
    setIndex(next)
    setPlayId((value) => value + 1)
  }

  useLayoutEffect(() => {
    const hasVeil = current.kind !== 'graphic'
    document.body.classList.toggle('hero-on-light', current.kind === 'graphic')

    const img = document.querySelector('.hero__slide.is-active img')
    if (!(img instanceof HTMLImageElement)) return

    let cancelled = false
    const apply = () => {
      if (cancelled) return
      document.body.classList.toggle('hero-on-light', readBannerTone(img, hasVeil, current.kind) === 'light')
    }

    if (img.complete && img.naturalWidth > 0) apply()
    else img.addEventListener('load', apply)
    return () => {
      cancelled = true
      img.removeEventListener('load', apply)
      document.body.classList.remove('hero-on-light')
    }
  }, [index, current.kind])

  useEffect(() => {
    if (slides.length < 2) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = window.setInterval(() => {
      setIndex((value) => (value + 1) % slides.length)
    }, SLIDE_MS)
    return () => window.clearInterval(id)
  }, [index, slides.length])

  return (
    <section
      className={graphic ? 'hero hero--graphic' : 'hero'}
      aria-roledescription="carousel"
      aria-label={copy.heroCarouselAria}
    >
      {slides.map((slide, slideIndex) => (
        <div
          key={slide.heading}
          className={[
            'hero__slide',
            slide.kind === 'graphic' ? 'hero__slide--graphic' : '',
            slideIndex === index ? 'is-active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-hidden={slideIndex !== index}
        >
          {slide.kind === 'graphic' && 'imageMobile' in slide ? (
            <picture>
              <source media="(min-width: 900px)" srcSet={slide.image} />
              <img src={slide.imageMobile} alt="" />
            </picture>
          ) : (
            <img src={slide.image} alt="" />
          )}
          {slide.kind === 'graphic' ? null : <div className="hero__veil" />}
        </div>
      ))}

      <div className="hero__stage">
        <div className="hero__copy">
          <h1>
            {nbspText(current.heading)}
            {current.headingMore ? (
              <>
                <br />
                {nbspText(current.headingMore)}
              </>
            ) : null}
          </h1>
          {current.text ? <p>{nbspText(current.text)}</p> : null}
          <a className="btn btn-yellow hero__cta" href={current.href}>
            {current.cta}
            <IconArrowUpRight size={18} stroke={2} />
          </a>
        </div>

        <div className="hero__foot">
          <div className="hero__dots" role="tablist" aria-label={copy.heroCarouselAria}>
            {slides.map((slide, slideIndex) => {
              const active = slideIndex === index
              const done = slideIndex < index
              return (
                <button
                  key={`dot-${slide.heading}`}
                  type="button"
                  role="tab"
                  className={active ? 'is-active' : done ? 'is-done' : undefined}
                  aria-selected={active}
                  aria-label={`${slideIndex + 1} / ${slides.length}`}
                  onClick={() => goTo(slideIndex)}
                >
                  <span
                    className="hero__dots-fill"
                    key={active ? `play-${playId}` : 'idle'}
                    style={active ? { animationDuration: `${SLIDE_MS}ms` } : undefined}
                  />
                </button>
              )
            })}
          </div>

          <ul className="hero__bar" aria-label={copy.heroAdvantagesAria}>
            {copy.heroAdvantages.map((item, itemIndex) => {
              const Icon = ADVANTAGE_ICONS[itemIndex]
              return (
                <li key={item.value}>
                  {Icon ? <Icon size={32} stroke={1.6} aria-hidden="true" /> : null}
                  <div>
                    <p>
                      {item.mobile ? (
                        <>
                          <span className="hero__bar-desk">
                            {item.label[0]}
                            <br />
                            {item.label[1]}
                          </span>
                          <span className="hero__bar-mob">
                            {item.mobile.label[0]}
                            <br />
                            {item.mobile.label[1]}
                          </span>
                        </>
                      ) : (
                        <>
                          {item.label[0]}
                          <br />
                          {item.label[1]}
                        </>
                      )}
                    </p>
                    <strong>
                      {item.mobile ? (
                        <>
                          <span className="hero__bar-desk">{item.value}</span>
                          <span className="hero__bar-mob">{item.mobile.value}</span>
                        </>
                      ) : (
                        item.value
                      )}
                    </strong>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </div>

      {current.kind === 'graphic' ? (
        <div className="hero__visual" aria-hidden="true">
          <img src={current.image} alt="" />
        </div>
      ) : null}
    </section>
  )
}
