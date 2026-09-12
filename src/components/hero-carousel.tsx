"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

// Длительность доводки дорожки. Уходит в CSS-переменную: по этому же сроку
// компонент переставляет дорожку с клона на настоящий слот, и разъехаться
// двум значениям нельзя.
const SHIFT_MS = 420;

/**
 * Сдвиг дорожки.
 *
 * Отсчёт ведётся по местам в дорожке, а не по слотам: нулевое место занимает
 * клон последнего слота, поэтому слот с номером pos лежит на месте pos + 1.
 */
function shiftFor(pos: number, dx: number | null): string {
  const base = `${(pos + 1) * -100}%`;
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
  const count = promos.length;

  /* Бесконечная прокрутка.
   *
   * pos — место в дорожке, и оно намеренно выходит за границы списка: с
   * последнего слота шаг вперёд ведёт на count, с первого шаг назад на -1.
   * По краям дорожки лежат клоны: перед первым слотом копия последнего,
   * после последнего копия первого. Поэтому за краем всегда видно то, что
   * человек ожидает увидеть, и лента едет дальше в ту же сторону.
   *
   * Когда доводка закончилась и pos оказался на клоне, дорожка мгновенно, с
   * выключенным переходом, переставляется на настоящий слот — картинка при
   * этом не меняется, клон и слот выглядят одинаково. Без этого лента при
   * переходе с последнего на первый отматывалась назад через все слоты.
   */
  const [pos, setPos] = useState(0);
  const [playId, setPlayId] = useState(0);
  // Индекс настоящего слота: pos приводится в границы списка.
  const index = count ? ((pos % count) + count) % count : 0;

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

  const track = useRef<HTMLDivElement>(null);
  const dragFrom = useRef<number | null>(null);

  /* Доворот с клона на настоящий слот — перед шагом, а не после анимации.
   *
   * Дорожка остаётся стоять на клоне, пока не понадобится ехать дальше: для
   * глаза это то же самое, клон и слот выглядят одинаково. А когда шаг
   * нужен, дорожка сначала бесшумно переставляется на настоящий слот и
   * только потом едет.
   *
   * Так доворот не зависит ни от события transitionend, ни от кадра
   * анимации: и то и другое не приходит в свёрнутой вкладке, и лента то
   * уезжала за конец, то навсегда оставалась без перехода.
   */
  const normalize = useCallback((): number => {
    if (count < 2) return pos;
    if (pos >= 0 && pos < count) return pos;
    const real = ((pos % count) + count) % count;
    const node = track.current;
    if (node) {
      node.style.transition = "none";
      node.style.transform = shiftFor(real, null);
      // Чтение вынуждает браузер применить значение до возврата перехода,
      // иначе оба присваивания схлопнутся в одно и доворот проедет с
      // анимацией через всю дорожку.
      void node.offsetWidth;
      node.style.transition = "";
    }
    return real;
    // Пересоздаётся только при смене места или списка: иначе таймер
    // автоповорота сбрасывался бы на каждом рендере.
  }, [count, pos]);

  const step = useCallback(
    (by: number) => {
      setPos(normalize() + by);
      setPlayId((value) => value + 1);
    },
    [normalize],
  );

  /** Переход к конкретному слоту: считаем от текущего места, а не от нуля. */
  function goTo(next: number) {
    normalize();
    setPos(next);
    setPlayId((value) => value + 1);
  }

  /* Сдвиг пишется конкретным значением, а не через переменную.
   *
   * С transform, собранным из var(), переход вешался на неанимируемые
   * пользовательские свойства: браузер оставлял CSSTransition в состоянии
   * running навсегда, и тот насмерть перекрывал вычисленный сдвиг — дорожка
   * замирала и не реагировала ни на шевроны, ни на палец.
   */
  function applyShift(dx: number | null) {
    const node = track.current;
    if (!node) return;
    // Во время тяги переход выключен, иначе лента отставала бы от пальца.
    node.classList.toggle("is-dragging", dx !== null);
    node.style.transform = shiftFor(pos, dx);
  }

  function onPointerDown(event: React.PointerEvent) {
    if (count < 2) return;
    if ((event.target as HTMLElement).closest("button")) return;
    dragFrom.current = event.clientX;
    applyShift(0);
  }

  function onPointerMove(event: React.PointerEvent) {
    if (dragFrom.current === null) return;
    const dx = event.clientX - dragFrom.current;
    const width = track.current?.offsetWidth ?? 0;
    // Ограничение шириной слота: дальше одного шага за раз лента не уходит,
    // а упора по краям нет — за ними лежат клоны.
    applyShift(Math.max(-width, Math.min(width, dx)));
  }

  function onPointerEnd(event: React.PointerEvent) {
    if (dragFrom.current === null) return;
    const dx = event.clientX - dragFrom.current;
    const width = track.current?.offsetWidth ?? 0;
    dragFrom.current = null;
    applyShift(null);
    if (width && Math.abs(dx) > width * SWIPE_RATIO) step(dx < 0 ? 1 : -1);
  }

  /* Подсказка о жесте.
   *
   * Слот занимает кадр целиком, соседний из-за края не выглядывает, и о
   * возможности листать пальцем ничто не сообщает. Поэтому лента дважды
   * коротко смещается и возвращается.
   *
   * Смещение пишется тем же способом, что при тяге пальцем. applyShift здесь
   * не нужен: он замкнут на текущее место и тянул бы эффект в зависимости,
   * перезапуская подсказку на каждой смене слота. Место здесь заведомо
   * нулевое — подсказка играет один раз при появлении блока.
   *
   * Только на телефоне: на указателе жест не основной способ.
   */
  useEffect(() => {
    if (count < 2) return;
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
  }, [count]);

  useEffect(() => {
    if (paused) return;
    if (count < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Таймер на один шаг, а не интервал: эффект и так перезапускается на
    // каждом слоте, и повторяющийся таймер только копил бы расхождение.
    const id = window.setTimeout(() => step(1), SLIDE_MS);
    return () => window.clearTimeout(id);
  }, [pos, paused, count, step]);

  if (!count) return null;

  /* Места в дорожке: клон последнего, все слоты, клон первого.
   *
   * Клоны нужны только для вида, поэтому скрыты от программ чтения и не
   * получают фокус — иначе один и тот же слот встречался бы в обходе дважды.
   */
  const lane = [
    { promo: promos[count - 1], key: "clone-last", clone: true },
    ...promos.map((promo) => ({ promo, key: promo.heading, clone: false })),
    { promo: promos[0], key: "clone-first", clone: true },
  ];

  return (
    <section
      className="hero"
      style={
        {
          "--hero-slide-ms": `${SLIDE_MS}ms`,
          "--hero-shift-ms": `${SHIFT_MS}ms`,
        } as React.CSSProperties
      }
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
            style={{ transform: shiftFor(pos, null) }}
          >
            {lane.map(({ promo, key, clone }, lanePos) => {
              if (!promo) return null;
              const active = !clone && lanePos - 1 === index;
              return (
                <a
                  key={key}
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
          {count > 1 ? (
            <div className="hero__promo-nav">
              <span className="hero__promo-nav-spacer" aria-hidden="true" />
              <span className="hero__promo-nav-row">
                <button
                  type="button"
                  aria-label={copy.heroPromoPrev}
                  onClick={() => step(-1)}
                >
                  <IconChevronLeft size={15} stroke={2.2} />
                </button>
                <button
                  type="button"
                  aria-label={copy.heroPromoNext}
                  onClick={() => step(1)}
                >
                  <IconChevronRight size={15} stroke={2.2} />
                </button>
              </span>
            </div>
          ) : null}

          {/* Полоса прогресса, она же переключатель, у нижней границы
              карточки. Слоем по той же причине, что шевроны. */}
          {count > 1 ? (
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
      </div>
    </section>
  );
}
