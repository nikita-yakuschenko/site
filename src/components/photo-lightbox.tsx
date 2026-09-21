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
  const [legendOn, setLegendOn] = useState(false);
  const legend = legends?.[index];
  const go = useCallback(
    (step: number) => onIndex((index + step + total) % total),
    [index, total, onIndex],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") go(1);
      if (event.key === "ArrowLeft") go(-1);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [go, onClose]);

  /* Активная миниатюра уезжает за край ленты, если кадры листают
     стрелками: подтягиваем её обратно. */
  useEffect(() => {
    const active = strip.current?.children[index];
    active?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [index]);

  const src = images[index];
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
            go(-1);
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
        <div className="photo-lightbox__shot">
          <Image
            key={src}
            src={src}
            alt=""
            width={2000}
            height={1400}
            sizes="100vw"
            priority
          />

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
              go(1);
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
                onClick={() => onIndex(i)}
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
