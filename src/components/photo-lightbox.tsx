"use client";

import Image from "next/image";
import {
  IconChevronLeft,
  IconChevronRight,
  IconTableColumn,
  IconX,
} from "@tabler/icons-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { copy } from "../lib/copy";

/**
 * Просмотр кадра во весь экран.
 *
 * На плитке кадр обрезан по 16:9 и уменьшен — разглядеть на нём отделку
 * нельзя. Поэтому кадр открывается целиком, с перелистыванием: смотрят
 * обычно не один снимок, а подряд, и возвращаться к сетке ради каждого
 * следующего — лишний шаг.
 */

/** Предельное увеличение. Дальше видно зерно, а не отделку. */
const MAX_SCALE = 4;

/** Увеличение по двойному касанию: заметно, но не теряешь, где находишься. */
const TAP_SCALE = 2.5;

/* Доля ширины, после которой кадр долистывается сам. Меньше — палец
   отпустили, не доведя, и лента возвращается на место. */
const SWIPE_RATIO = 0.22;

/* Длительность доводки. Столько же стоит в стилях у самой ленты: если
   значения разойдутся, кадр сменится раньше или позже, чем доедет. */
const SETTLE_MS = 280;

/**
 * Щипок увеличивает кадр, а не страницу.
 *
 * Пока жест не перехвачен, им распоряжается браузер: на телефоне щипок
 * масштабировал весь интерфейс вместе с кнопками, а сам снимок оставался
 * прежнего размера. Поэтому касания забираются себе — touch-action: none в
 * стилях, — и превращаются в перемещение и масштаб самого кадра.
 *
 * Модель простая: точка кадра p на экране лежит в s * p + t. При щипке
 * серединa между пальцами должна остаться над той же точкой снимка, отсюда
 * t = m - s₁ * (m - t₀) / s₀.
 */
const FLAT = { scale: 1, x: 0, y: 0 };

function useZoom(
  resetKey: unknown,
  box: React.RefObject<HTMLDivElement | null>,
  /** Кадр едет за пальцем: сюда уходит текущий сдвиг, а по отпускании —
      итоговый. Решение, листать или вернуть на место, принимает сам
      просмотрщик: он знает ширину площадки. */
  onDrag: (px: number) => void,
  onDragEnd: (px: number) => void,
) {
  const [view, setView] = useState(FLAT);
  const points = useRef(new Map<number, { x: number; y: number }>());
  const start = useRef({ dist: 0, mx: 0, my: 0, scale: 1, x: 0, y: 0 });
  const lastTap = useRef(0);
  const swipe = useRef<{ x: number; y: number } | null>(null);

  /* Новый кадр открывают целиком: увеличение прошлого к нему не относится.
     Сброс идёт прямо в отрисовке, а не эффектом: эффект сработал бы после
     того, как новый кадр уже показан в чужом масштабе, и это было бы видно
     как рывок. React для смены состояния вслед за свойством предлагает
     ровно этот приём. */
  const [shownKey, setShownKey] = useState(resetKey);
  if (shownKey !== resetKey) {
    setShownKey(resetKey);
    setView(FLAT);
  }

  /* Кадр не отпускает края экрана: пока он больше площадки, его можно
     таскать ровно настолько, насколько он за неё вышел, а как только он в
     неё помещается — встаёт по центру.

     Считаем от самого снимка, а не от площадки: снимок вписан в неё и почти
     всегда меньше, поэтому запас хода у них разный. Снимок стоит по центру,
     его левый край отстоит от края площадки на (площадка − снимок) / 2, и
     видимое положение точки p равно этому отступу плюс сдвиг плюс масштаб
     на p. Отсюда и пределы ниже. */
  const clamp = (scale: number, x: number, y: number) => {
    const stage = box.current?.getBoundingClientRect();
    const shot = box.current?.querySelector("img");
    if (!stage || !shot) return { scale, x, y };

    const axis = (value: number, size: number, room: number) => {
      const offset = (room - size) / 2;
      const scaled = scale * size;

      /* По этой оси увеличенный кадр всё ещё умещается в площадку — значит
         таскать его некуда, он просто встаёт по её середине. Ноль тут не
         подходит: снимок вписан по своей исходной высоте, и при масштабе
         больше единицы он свисал бы вниз. */
      if (scaled <= room) return (room - scaled) / 2 - offset;

      // Кадр больше площадки: края не отпускаем, между ними он свободен.
      return Math.min(-offset, Math.max(room - offset - scaled, value));
    };

    return {
      scale,
      x: axis(x, shot.offsetWidth, stage.width),
      y: axis(y, shot.offsetHeight, stage.height),
    };
  };

  const local = (event: React.PointerEvent) => {
    const rect = box.current?.getBoundingClientRect();
    return {
      x: event.clientX - (rect?.left ?? 0),
      y: event.clientY - (rect?.top ?? 0),
    };
  };

  const onPointerDown = (event: React.PointerEvent) => {
    try {
      box.current?.setPointerCapture?.(event.pointerId);
    } catch {
      /* Захват не удался — жест всё равно отследим по событиям элемента. */
    }
    points.current.set(event.pointerId, local(event));

    if (points.current.size === 2) {
      const [a, b] = [...points.current.values()];
      if (!a || !b) return;
      /* Пальцев стало двое — это щипок, и первое касание перестаёт быть
         началом двойного: иначе следующее касание после щипка считалось бы
         вторым и сбрасывало масштаб. */
      lastTap.current = 0;
      swipe.current = null;
      start.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        mx: (a.x + b.x) / 2,
        my: (a.y + b.y) / 2,
        scale: view.scale,
        x: view.x,
        y: view.y,
      };
      return;
    }

    // Двойное касание: увеличить в точку касания или вернуть кадр целиком.
    const now = Date.now();
    if (event.pointerType !== "mouse" && now - lastTap.current < 300) {
      lastTap.current = 0;
      const point = local(event);
      if (view.scale > 1) {
        setView({ scale: 1, x: 0, y: 0 });
      } else {
        const next = TAP_SCALE;
        setView(
          clamp(next, point.x - next * point.x, point.y - next * point.y),
        );
      }
      return;
    }
    start.current = {
      ...start.current,
      scale: view.scale,
      x: view.x,
      y: view.y,
    };
    // Смах считаем только от невязкого кадра: увеличенный тянут, а не листают.
    swipe.current = view.scale > 1 ? null : local(event);
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (!points.current.has(event.pointerId)) return;
    const prev = points.current.get(event.pointerId)!;
    const point = local(event);
    points.current.set(event.pointerId, point);

    // Кадр не увеличен — ведём его за пальцем.
    if (points.current.size === 1 && view.scale <= 1 && swipe.current) {
      onDrag(point.x - swipe.current.x);
      return;
    }

    if (points.current.size >= 2) {
      const [a, b] = [...points.current.values()];
      if (!a || !b) return;
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const scale = Math.min(
        MAX_SCALE,
        Math.max(1, (start.current.scale * dist) / start.current.dist),
      );
      const ratio = scale / start.current.scale;
      setView(
        clamp(
          scale,
          start.current.mx - ratio * (start.current.mx - start.current.x),
          start.current.my - ratio * (start.current.my - start.current.y),
        ),
      );
      return;
    }

    // Один палец тянет кадр — но только когда его увеличили.
    if (view.scale <= 1) return;
    setView((current) =>
      clamp(
        current.scale,
        current.x + (point.x - prev.x),
        current.y + (point.y - prev.y),
      ),
    );
  };

  const onPointerEnd = (event: React.PointerEvent) => {
    const from = swipe.current;
    swipe.current = null;
    if (from && points.current.size === 1 && view.scale <= 1) {
      const to = local(event);
      onDragEnd(to.x - from.x);
    }

    /* Касание засчитывается как одиночное здесь, а не при нажатии: отсчёт
       двойного должен идти от отпущенного пальца, иначе в него попадает
       второй палец щипка. */
    if (from && points.current.size === 1 && event.pointerType !== "mouse") {
      const to = local(event);
      const moved = Math.hypot(to.x - from.x, to.y - from.y);
      lastTap.current = moved < 12 ? Date.now() : 0;
    }

    points.current.delete(event.pointerId);
    if (points.current.size === 1) {
      // Один палец остался: дальше он тянет кадр, и отсчёт начинается заново.
      const rest = [...points.current.values()][0];
      if (rest)
        start.current = {
          ...start.current,
          scale: view.scale,
          x: view.x,
          y: view.y,
        };
    }
  };

  return {
    zoomed: view.scale > 1,
    style: {
      transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})`,
    } as React.CSSProperties,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: onPointerEnd,
      onPointerCancel: onPointerEnd,
    },
  };
}
export function PhotoLightbox({
  images,
  labels,
  legends,
  index,
  onIndex,
  onClose,
}: {
  images: readonly string[];
  /** Подписи к кадрам: у планировок это вариант, и без подписи, открыв
   *  чертёж, уже не понять, какой из них смотришь. */
  labels?: readonly string[];
  /** Экспликация к кадру: на чертеже подписи мелкие, и список площадей
   *  нужен там же, где сам план. Открывается поверх кадра по кнопке. */
  legends?: readonly (readonly { name: string; area: string }[] | undefined)[];
  index: number;
  onIndex: (next: number) => void;
  onClose: () => void;
}) {
  const total = images.length;
  const strip = useRef<HTMLDivElement>(null);
  const shot = useRef<HTMLDivElement>(null);
  const [legendOn, setLegendOn] = useState(false);
  const legend = legends?.[index];
  const go = useCallback(
    (step: number) => {
      onIndex((index + step + total) % total);
    },
    [index, total, onIndex],
  );
  const pick = onIndex;

  /* Лента из трёх кадров: предыдущий, текущий, следующий. Она стоит
     сдвинутой на один кадр влево, поэтому в площадке виден средний, а
     соседи ждут за её краями.

     dx — сдвиг под пальцем в пикселях. Пока палец ведёт, перехода нет и
     лента идёт след в след; по отпускании включается доводка, и лента
     доезжает до соседа либо возвращается на место. */
  const [dx, setDx] = useState(0);
  const [settling, setSettling] = useState(false);
  const track = useRef<HTMLDivElement>(null);
  const settleTimer = useRef(0);

  const slideTo = useCallback(
    (step: number) => {
      const width = track.current?.offsetWidth ?? 0;
      window.clearTimeout(settleTimer.current);
      setSettling(true);
      setDx(step === 0 || !width ? 0 : step > 0 ? -width : width);
      settleTimer.current = window.setTimeout(() => {
        /* Кадр меняется, когда лента доехала: одновременно снимаем сдвиг и
           переход, иначе лента поедет обратно у всех на глазах. */
        setSettling(false);
        setDx(0);
        if (step !== 0) go(step);
      }, SETTLE_MS);
    },
    [go],
  );

  useEffect(() => () => window.clearTimeout(settleTimer.current), []);

  const onDrag = useCallback((px: number) => {
    window.clearTimeout(settleTimer.current);
    setSettling(false);
    setDx(px);
  }, []);

  const onDragEnd = useCallback(
    (px: number) => {
      const width = track.current?.offsetWidth ?? 0;
      const enough = width > 0 && Math.abs(px) > width * SWIPE_RATIO;
      slideTo(enough ? (px < 0 ? 1 : -1) : 0);
    },
    [slideTo],
  );

  const zoom = useZoom(index, shot, onDrag, onDragEnd);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") slideTo(1);
      if (event.key === "ArrowLeft") slideTo(-1);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [slideTo, onClose]);

  /* Активная миниатюра уезжает за край ленты, если кадры листают
     стрелками: подтягиваем её обратно. */
  useEffect(() => {
    const active = strip.current?.children[index];
    active?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [index]);

  const src = images[index];
  /* Соседи по ленте. По кругу: с последнего кадра следующий — первый, и
     наоборот, — иначе у краёв лента упиралась бы в пустоту. */
  const before = total > 1 ? images[(index - 1 + total) % total] : undefined;
  const after = total > 1 ? images[(index + 1) % total] : undefined;
  if (!src) return null;

  return (
    <div
      className="photo-lightbox"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <button
        type="button"
        className="photo-lightbox__close"
        aria-label={copy.close}
        onClick={onClose}
      >
        <IconX size={20} stroke={2.2} />
      </button>

      {total > 1 ? (
        <button
          type="button"
          className="photo-lightbox__nav photo-lightbox__nav--prev"
          aria-label={copy.galleryPrev}
          onClick={(event) => {
            event.stopPropagation();
            slideTo(-1);
          }}
        >
          <IconChevronLeft size={24} stroke={2.2} />
        </button>
      ) : null}

      <figure
        className="photo-lightbox__frame"
        onClick={(event) => event.stopPropagation()}
      >
        {labels?.[index] ? (
          <figcaption className="photo-lightbox__caption">
            {labels[index]}
          </figcaption>
        ) : null}
        <div
          className={
            zoom.zoomed
              ? "photo-lightbox__shot is-zoomed"
              : "photo-lightbox__shot"
          }
          ref={shot}
          onPointerDown={zoom.handlers.onPointerDown}
          onPointerMove={zoom.handlers.onPointerMove}
          onPointerUp={zoom.handlers.onPointerUp}
          onPointerCancel={zoom.handlers.onPointerCancel}
        >
          {/* Лента из трёх кадров. Стоит сдвинутой на один кадр влево,
              поэтому в площадке виден средний, а соседи ждут за её краями и
              выезжают следом за пальцем.

              Масштаб применяется к самому изображению, а не к ленте: лента
              занята перелистыванием, и два преобразования на одном узле
              спорили бы друг с другом. */}
          <div
            ref={track}
            className={
              settling
                ? "photo-lightbox__track is-settling"
                : "photo-lightbox__track"
            }
            style={{
              transform: `translate3d(calc(-100% + ${dx}px), 0, 0)`,
            }}
          >
            <div className="photo-lightbox__slide">
              {before ? (
                <Image
                  src={before}
                  alt=""
                  width={2000}
                  height={1400}
                  sizes="100vw"
                />
              ) : null}
            </div>

            <div className="photo-lightbox__slide">
              <Image
                key={src}
                src={src}
                alt=""
                width={2000}
                height={1400}
                sizes="100vw"
                priority
                style={zoom.style}
              />
            </div>

            <div className="photo-lightbox__slide">
              {after ? (
                <Image
                  src={after}
                  alt=""
                  width={2000}
                  height={1400}
                  sizes="100vw"
                />
              ) : null}
            </div>
          </div>

          {legend?.length ? (
            <>
              {/* Пока экспликация открыта, кнопки нет вовсе: панель встаёт
                  на её место, а закрывает крестик внутри. */}
              {legendOn ? null : (
                <button
                  type="button"
                  className="photo-lightbox__legend-toggle"
                  aria-label={copy.plansLegend}
                  onClick={() => setLegendOn(true)}
                >
                  <IconTableColumn size={20} stroke={1.9} />
                </button>
              )}

              {legendOn ? (
                <div className="photo-lightbox__legend">
                  <p>
                    {copy.plansLegend}
                    <button
                      type="button"
                      aria-label={copy.close}
                      onClick={() => setLegendOn(false)}
                    >
                      <IconX size={15} stroke={2.2} />
                    </button>
                  </p>
                  <dl>
                    {legend.map((room, i) => (
                      <div key={`${room.name}-${i}`}>
                        <dt>{room.name}</dt>
                        <dd>{room.area}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </figure>

      {total > 1 ? (
        <>
          <button
            type="button"
            className="photo-lightbox__nav photo-lightbox__nav--next"
            aria-label={copy.galleryNext}
            onClick={(event) => {
              event.stopPropagation();
              slideTo(1);
            }}
          >
            <IconChevronRight size={24} stroke={2.2} />
          </button>

          {/* Лента миниатюр: из неё видно, сколько кадров всего и что
              будет дальше, — счётчик этого не показывает. */}
          <div
            className="photo-lightbox__strip"
            ref={strip}
            onClick={(event) => event.stopPropagation()}
          >
            {images.map((thumb, i) => (
              <button
                key={thumb}
                type="button"
                className={
                  i === index
                    ? "photo-lightbox__thumb photo-lightbox__thumb--on"
                    : "photo-lightbox__thumb"
                }
                aria-label={`${copy.galleryOpen} ${i + 1}`}
                aria-current={i === index}
                onClick={() => pick(i)}
              >
                <Image
                  src={thumb}
                  alt=""
                  width={200}
                  height={130}
                  sizes="120px"
                />
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
