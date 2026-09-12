"use client";

import { useEffect, useRef, useState } from "react";
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
 * в слот целиком. Фотография кадрируется заливкой — иначе вокруг неё
 * остаются неоднородные поля.
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

// Порог жеста: доля ширины слота, после которой лента доводит до следующего,
// а не возвращается. Четверть — достаточно, чтобы короткое касание при
// вертикальной прокрутке не листало слоты.
const SWIPE_RATIO = 0.25;

/** Сдвиг дорожки: целые шаги по слотам плюс смещение пальца, если оно есть. */
function shiftFor(index: number, dx: number | null): string {
  const base = `${index * -100}%`;
  return dx === null
    ? `translate3d(${base}, 0, 0)`
    : `translate3d(calc(${base} + ${dx}px), 0, 0)`;
}

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

  /* Перелистывание: одна дорожка на оба способа.
   *
   * Слоты лежат в ряд, дорожка сдвигается на целую ширину слота — уходящий
   * полностью покидает кадр, следующий полностью въезжает. До этого слоты
   * лежали стопкой и подменялись перекрёстным затуханием, из-за чего жест
   * выглядел перетаскиванием с отскоком и подменой на месте.
   *
   * Шевроны и жест меняют один и тот же index, поэтому едут одинаково. До
   * этого кнопки шли через затухание, а палец через сдвиг, и переключение
   * выглядело двумя разными механизмами.
   *
   * Смещение пальца пишется прямо в узел, а не через состояние: иначе
   * каждое движение вызывало бы перерисовку всей карусели.
   */
  const track = useRef<HTMLDivElement>(null);
  const dragFrom = useRef<number | null>(null);

  /* Сдвиг дорожки пишется конкретным значением, а не через переменную.
   *
   * С transform, собранным из var(), переход вешался на неанимируемые
   * пользовательские свойства: браузер оставлял CSSTransition в состоянии
   * running навсегда, и он насмерть перекрывал вычисленный сдвиг — дорожка
   * замирала и больше не реагировала ни на шевроны, ни на палец. */
  function applyShift(dx: number | null) {
    const node = track.current;
    if (!node) return;
    // Во время тяги переход выключен, иначе лента отставала бы от пальца.
    node.classList.toggle("is-dragging", dx !== null);
    node.style.transform = shiftFor(index, dx);
  }

  function onPointerDown(event: React.PointerEvent) {
    if (promos.length < 2) return;
    if ((event.target as HTMLElement).closest("button")) return;
    dragFrom.current = event.clientX;
    applyShift(0);
  }

  function onPointerMove(event: React.PointerEvent) {
    if (dragFrom.current === null) return;
    const dx = event.clientX - dragFrom.current;
    const width = track.current?.offsetWidth ?? 0;
    // На краях лента поддаётся втрое меньше: листать дальше некуда, и полный
    // ход показывал бы пустоту за крайним слотом.
    const atEdge =
      (index === 0 && dx > 0) || (index === promos.length - 1 && dx < 0);
    applyShift(atEdge ? dx / 3 : Math.max(-width, Math.min(width, dx)));
  }

  function onPointerEnd(event: React.PointerEvent) {
    if (dragFrom.current === null) return;
    const dx = event.clientX - dragFrom.current;
    const width = track.current?.offsetWidth ?? 0;
    dragFrom.current = null;
    applyShift(null);
    if (width && Math.abs(dx) > width * SWIPE_RATIO) {
      goTo(index + (dx < 0 ? 1 : -1));
    }
  }

  /* Подсказка о жесте.
   *
   * Слот занимает кадр целиком, соседний из-за края не выглядывает, и о
   * возможности листать пальцем ничто не сообщает. Поэтому лента дважды
   * коротко смещается и возвращается.
   *
   * Смещение пишется тем же способом, что при тяге пальцем: отдельная
   * анимация на transform спорила бы со сдвигом дорожки. Индекс здесь
   * заведомо нулевой — подсказка играет один раз при появлении блока, — и
   * поэтому applyShift не нужен: он замкнут на текущий индекс и тянул бы
   * эффект в зависимости, перезапуская подсказку на каждой смене слота.
   *
   * Только на телефоне: на указателе жест не основной способ.
   */
  useEffect(() => {
    if (promos.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(max-width: 599px)").matches) return;
    const node = track.current;
    if (!node) return;

    const steps: Array<[number, number]> = [
      [1200, -18],
      [1620, 0],
      [2040, -18],
      [2460, 0],
    ];
    const ids = steps.map(([at, px]) =>
      window.setTimeout(() => {
        // Если палец уже на ленте, подсказка молчит.
        if (dragFrom.current !== null) return;
        node.classList.toggle("is-dragging", false);
        node.style.transform = shiftFor(0, px || null);
      }, at),
    );

    return () => {
      ids.forEach((id) => window.clearTimeout(id));
      node.style.transform = shiftFor(0, null);
    };
    // Один раз за жизнь блока: список слотов не меняется.
  }, [promos.length]);

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
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
            {...pauseProps}
          >
            <div
              ref={track}
              className="hero__promos-track"
              style={{ transform: shiftFor(index, null) }}
            >
              {promos.map((promo, promoIndex) => {
                const active = promoIndex === index;
                return (
                  <a
                    key={promo.heading}
                    className="hero__promo"
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
            </div>

            {/* Шевроны на строке надзаголовка. Слоем, а не в дорожке: внутри
                они уезжали бы вместе со слотом, и кнопки внутри <a>
                недопустимы. Распорка 16:9 повторяет высоту медиа-слота и
                опускает ряд ровно на эту строку. */}
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

            {/* Полоса прогресса, она же переключатель, у нижней границы
                карточки. Слоем по той же причине, что шевроны. */}
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
