"use client";

import { useEffect, useState } from "react";
import {
  IconArrowUpRight,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react";
import { copy, nbspText } from "../lib/copy";

/**
 * Сообщение баннера. Постоянное: это то, что компания говорит о себе
 * всегда, и ротации оно не требует. Мобильный кадр необязателен — если его
 * нет, берётся общий.
 */
export type HeroMessage = {
  heading: string;
  headingMore?: string;
  text?: string;
  cta: string;
  href: string;
  image: string;
  imageMobile?: string;
};

/**
 * Медиа-слот поверх кадра. Листаются именно они, а не сообщение баннера.
 *
 * Медиа необязательно, но если есть — в слоте картинка или видео. video
 * старше image: задано и то и другое — играет видео, картинка остаётся
 * постером на время загрузки.
 *
 * cutout отмечает картинку, вырезанную на прозрачный фон: такая вписывается
 * в слот целиком и получает белую подложку. Фотография же кадрируется
 * заливкой — иначе вокруг неё остаются неоднородные поля.
 */
export type HeroPromo = {
  eyebrow?: string;
  heading: string;
  text?: string;
  cta: string;
  href: string;
  image?: string;
  video?: string;
  cutout?: boolean;
};

// Длительность слота. Текста в карточке три-четыре строки, шести секунд
// на прочтение не хватало. Значение отсюда же уходит в CSS-переменную, чтобы
// полоска прогресса и смена слота не разъезжались.
const SLIDE_MS = 11000;

export function HeroCarousel({
  message,
  promos,
}: {
  message: HeroMessage;
  promos: readonly HeroPromo[];
}) {
  const [index, setIndex] = useState(0);
  const [playId, setPlayId] = useState(0);
  // Пока читают — не листаем. Пауза стоит там, где действительно читают и
  // целятся: на самих слотах.
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

  function goTo(next: number) {
    setIndex((next + promos.length) % promos.length);
    setPlayId((value) => value + 1);
  }

  useEffect(() => {
    if (paused) return;
    if (promos.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Таймер на один шаг, а не интервал: эффект и так перезапускается на
    // каждом слоте, и повторяющийся таймер только копил бы расхождение.
    const id = window.setTimeout(() => {
      setIndex((value) => (value + 1) % promos.length);
      setPlayId((value) => value + 1);
    }, SLIDE_MS);
    return () => window.clearTimeout(id);
  }, [index, paused, promos.length]);

  return (
    <section
      className="hero"
      style={{ "--hero-slide-ms": `${SLIDE_MS}ms` } as React.CSSProperties}
    >
      {/* Кадр один: он часть постоянного сообщения и вместе со слотами не
          меняется. */}
      {message.imageMobile ? (
        <picture className="hero__frame">
          <source media="(min-width: 900px)" srcSet={message.image} />
          <img src={message.imageMobile} alt="" />
        </picture>
      ) : (
        <img className="hero__frame" src={message.image} alt="" />
      )}

      {/* Ровный тон по кадру: без градиента и без формы, одна плотность во
          всех точках. Ни плашки под текстом, ни тени по фотографии. */}
      <div className="hero__tone" aria-hidden="true" />

      <div className="hero__stage">
        <div className="hero__copy">
          <h1>
            {nbspText(message.heading)}
            {message.headingMore ? (
              <>
                <br />
                {nbspText(message.headingMore)}
              </>
            ) : null}
          </h1>
          {message.text ? <p>{nbspText(message.text)}</p> : null}
          <a className="btn btn-yellow hero__cta" href={message.href}>
            {message.cta}
            <IconArrowUpRight size={18} stroke={2} />
          </a>
        </div>

        {promos.length ? (
          <div
            className="hero__promos"
            aria-roledescription="carousel"
            aria-label={copy.heroPromosAria}
            {...pauseProps}
          >
            {promos.map((promo, promoIndex) => {
              const active = promoIndex === index;
              return (
                <a
                  key={promo.heading}
                  className={active ? "hero__promo is-active" : "hero__promo"}
                  href={promo.href}
                  aria-hidden={!active}
                  tabIndex={active ? undefined : -1}
                >
                  {promo.video || promo.image ? (
                    <span
                      className={
                        promo.cutout
                          ? "hero__promo-media is-cutout"
                          : "hero__promo-media"
                      }
                    >
                      {promo.video ? (
                        <video
                          src={promo.video}
                          poster={promo.image}
                          muted
                          loop
                          autoPlay
                          playsInline
                        />
                      ) : (
                        <img src={promo.image} alt="" />
                      )}
                    </span>
                  ) : null}

                  <span className="hero__promo-body">
                    {promo.eyebrow ? (
                      <span className="hero__promo-eyebrow">
                        {promo.eyebrow}
                      </span>
                    ) : null}
                    <strong>{nbspText(promo.heading)}</strong>
                    {promo.text ? <span>{nbspText(promo.text)}</span> : null}
                    <span className="hero__promo-cta">
                      {promo.cta}
                      <IconArrowUpRight size={16} stroke={2} />
                    </span>
                  </span>
                </a>
              );
            })}

            {/* Шевроны на строке надзаголовка. Слоем, а не в карточке:
                карточка — ссылка, кнопки внутри <a> недопустимы. Распорка
                16:9 повторяет высоту медиа-слота и опускает ряд ровно на
                эту строку — без неё пришлось бы задавать отступ числом. */}
            {promos.length > 1 ? (
              <div className="hero__promo-nav">
                <span className="hero__promo-nav-spacer" aria-hidden="true" />
                <span className="hero__promo-nav-row">
                  <button
                    type="button"
                    aria-label={copy.heroPromoPrev}
                    onClick={() => goTo(index - 1)}
                  >
                    <IconChevronLeft size={15} stroke={2.2} />
                  </button>
                  <button
                    type="button"
                    aria-label={copy.heroPromoNext}
                    onClick={() => goTo(index + 1)}
                  >
                    <IconChevronRight size={15} stroke={2.2} />
                  </button>
                </span>
              </div>
            ) : null}

            {/* Переключатель у нижней границы карточки. Он же индикатор:
                сегмент на слот, пройденные залиты, текущий заполняется по
                времени показа. Вынесен из ссылки — кнопки внутри <a>
                недопустимы, а без них слот было нечем переключить: клик в
                любое место карточки уводил на страницу. */}
            {promos.length > 1 ? (
              <div
                className="hero__promo-progress"
                role="tablist"
                aria-label={copy.heroPromosAria}
              >
                {promos.map((item, itemIndex) => {
                  const active = itemIndex === index;
                  return (
                    <button
                      key={`seg-${item.heading}`}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      aria-label={item.heading}
                      className={
                        active
                          ? "is-active"
                          : itemIndex < index
                            ? "is-done"
                            : undefined
                      }
                      onClick={() => goTo(itemIndex)}
                    >
                      <span className="hero__promo-progress-track">
                        <span
                          className="hero__promo-progress-fill"
                          key={active ? `play-${playId}` : "idle"}
                          style={
                            active
                              ? {
                                  animationDuration: `${SLIDE_MS}ms`,
                                  animationPlayState: paused
                                    ? "paused"
                                    : "running",
                                }
                              : undefined
                          }
                        />
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
