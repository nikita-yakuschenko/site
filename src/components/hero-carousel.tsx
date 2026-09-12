"use client";

import { useEffect, useState } from "react";
import { IconArrowUpRight } from "@tabler/icons-react";
import { copy, nbspText } from "../lib/copy";

/**
 * Слайд баннера — самостоятельная композиция: свой кадр, свой заголовок,
 * одно действие. Мобильный кадр необязателен: если его нет, берётся общий.
 */
export type HeroSlide = {
  heading: string;
  headingMore?: string;
  text?: string;
  cta: string;
  href: string;
  image: string;
  imageMobile?: string;
};

/** Кампания поверх кадра: своя плашка в углу, свой срок жизни. */
export type HeroPromo = {
  heading: string;
  text?: string;
  cta: string;
  href: string;
};

// Длительность слайда. Текста на баннере три-четыре строки, шести секунд
// на прочтение не хватало. Значение отсюда же уходит в CSS-переменную, чтобы
// полоска прогресса и смена кадра не разъезжались.
const SLIDE_MS = 11000;

export function HeroCarousel({
  slides,
  promo,
}: {
  slides: readonly HeroSlide[];
  promo?: HeroPromo | null;
}) {
  const [index, setIndex] = useState(0);
  const [playId, setPlayId] = useState(0);
  // Пока читают — не листаем. Раньше пауза висела на всей секции, но баннер
  // занимает весь первый экран: курсор оказывался над ним почти всегда, и
  // полоска то замирала, то дёргалась дальше. Теперь пауза только там, где
  // действительно читают и целятся, — текст и сами переключатели.
  const [paused, setPaused] = useState(false);

  const pauseProps = {
    onPointerEnter: (event: React.PointerEvent) => {
      if (event.pointerType !== "touch") setPaused(true);
    },
    onPointerLeave: () => setPaused(false),
    onFocusCapture: () => setPaused(true),
    onBlurCapture: (event: React.FocusEvent) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null))
        setPaused(false);
    },
  };
  const current = slides[index] || slides[0];

  function goTo(next: number) {
    setIndex(next);
    setPlayId((value) => value + 1);
  }

  useEffect(() => {
    if (paused) return;
    if (slides.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Таймер на один шаг, а не интервал: эффект и так перезапускается на
    // каждом слайде, и повторяющийся таймер только копил бы расхождение.
    const id = window.setTimeout(() => {
      setIndex((value) => (value + 1) % slides.length);
    }, SLIDE_MS);
    return () => window.clearTimeout(id);
  }, [index, paused, slides.length]);

  if (!current) return null;

  return (
    <section
      className="hero"
      aria-roledescription="carousel"
      aria-label={copy.heroCarouselAria}
      style={{ "--hero-slide-ms": `${SLIDE_MS}ms` } as React.CSSProperties}
    >
      {slides.map((slide, slideIndex) => (
        <div
          key={slide.heading}
          className={
            slideIndex === index ? "hero__slide is-active" : "hero__slide"
          }
          aria-hidden={slideIndex !== index}
        >
          {slide.imageMobile ? (
            <picture>
              <source media="(min-width: 900px)" srcSet={slide.image} />
              <img src={slide.imageMobile} alt="" />
            </picture>
          ) : (
            <img src={slide.image} alt="" />
          )}
        </div>
      ))}

      {/* Скрим один на все слайды: он привязан к текстовой колонке, а не
          к кадру, и при смене слайда ему меняться не за чем. */}
      <div className="hero__veil" aria-hidden="true" />

      <div className="hero__stage">
        <div className="hero__copy" {...pauseProps}>
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
          {promo ? (
            <a className="hero__promo" href={promo.href}>
              <span className="hero__promo-body">
                <strong>{nbspText(promo.heading)}</strong>
                {promo.text ? <span>{nbspText(promo.text)}</span> : null}
              </span>
              <span className="hero__promo-cta">
                {promo.cta}
                <IconArrowUpRight size={16} stroke={2} />
              </span>
            </a>
          ) : null}

          <div
            className="hero__dots"
            role="tablist"
            aria-label={copy.heroCarouselAria}
            {...pauseProps}
          >
            {slides.map((slide, slideIndex) => {
              const active = slideIndex === index;
              const done = slideIndex < index;
              return (
                <button
                  key={`dot-${slide.heading}`}
                  type="button"
                  role="tab"
                  className={
                    active ? "is-active" : done ? "is-done" : undefined
                  }
                  aria-selected={active}
                  aria-label={`${slideIndex + 1} / ${slides.length}`}
                  onClick={() => goTo(slideIndex)}
                >
                  <span
                    className="hero__dots-fill"
                    key={active ? `play-${playId}` : "idle"}
                    style={
                      active
                        ? {
                            animationDuration: `${SLIDE_MS}ms`,
                            animationPlayState: paused ? "paused" : "running",
                          }
                        : undefined
                    }
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
