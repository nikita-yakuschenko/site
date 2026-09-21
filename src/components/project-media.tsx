"use client";

import Image from "next/image";
import { useState } from "react";
import { copy } from "../lib/copy";
import { PhotoLightbox } from "./photo-lightbox";
import type { CatalogProject } from "../lib/catalog/types";

/**
 * Фасады, планировки и интерьеры — три раздела вместо одной ленты.
 *
 * Прежде страница показывала весь список кадров подряд: планировки,
 * фасады и комнаты вперемешку под заголовком «Фасады». Разложить их было
 * нечем — в каталоге все снимки лежали одним полем. Теперь раскладка есть,
 * и каждый раздел показывает своё.
 *
 * Кадры кликабельны: на плитке снимок обрезан по 16:9 и уменьшен, отделку
 * по нему не разглядеть — ради этого он и открывается целиком.
 *
 * Интерьеров бывает полтора десятка, и целиком сеткой они читаются как
 * простыня. Поэтому раздел показывает шесть кадров, а последняя плитка
 * говорит, сколько их ещё, и открывает просмотр.
 *
 * Форма у него своя: ровная сетка на тёмном фоне. Фасады, интерьеры и
 * построенные дома шли тремя одинаковыми бенто подряд и читались одним
 * полотном; к тому же крупный кадр здесь не нужен — это варианты
 * отделки, среди них нет главного.
 *
 * Интерьеры есть не у всех проектов, и раздел просто не выводится: пустой
 * заголовок хуже отсутствия.
 */

/** Фасады. Первый кадр крупный: ряд одинаковых прямоугольников не
 *  говорит, какой из них главный. */
export function ProjectExteriors({ project }: { project: CatalogProject }) {
  const shots = project.exteriors;
  const [open, setOpen] = useState<number | null>(null);
  if (!shots.length) return null;

  return (
    <section className="section" aria-labelledby="project-exteriors-title">
      <div className="section__inner">
        <p className="eyebrow">{copy.exteriors}</p>
        <h2 id="project-exteriors-title">{copy.exteriorsHeading}</h2>
        <div className="project-bento">
          {shots.map((src, index) => (
            <button
              key={src}
              type="button"
              className={index === 0 ? "project-bento__lead" : undefined}
              aria-label={copy.galleryOpen}
              onClick={() => setOpen(index)}
            >
              <Image
                src={src}
                alt=""
                width={1600}
                height={1000}
                sizes={index === 0 ? "(min-width: 900px) 66vw, 100vw" : "33vw"}
              />
            </button>
          ))}
        </div>
      </div>

      {open !== null ? (
        <PhotoLightbox
          images={shots}
          index={open}
          onIndex={setOpen}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </section>
  );
}

/** Интерьеры. Шесть плиток; остальные кадры — за последней. */
const INTERIOR_TILES = 6;

export function ProjectInteriors({ project }: { project: CatalogProject }) {
  const shots = project.interiors;
  const [open, setOpen] = useState<number | null>(null);
  if (!shots.length) return null;

  const tiles = shots.slice(0, INTERIOR_TILES);
  const rest = shots.length - tiles.length;

  return (
    <section
      className="section section--ink"
      aria-labelledby="project-interiors-title"
    >
      <div className="section__inner">
        <p className="eyebrow">{copy.interiorsEyebrow}</p>
        <h2 id="project-interiors-title">{copy.interiorsHeading}</h2>
        <div className="project-rows">
          {tiles.map((src, index) => {
            const last = rest > 0 && index === tiles.length - 1;
            const cls = last ? "project-rows__rest" : "";
            return (
              <button
                key={src}
                type="button"
                className={cls || undefined}
                aria-label={last ? `${copy.galleryRest} ${rest}` : copy.galleryOpen}
                onClick={() => setOpen(index)}
              >
                <Image
                  src={src}
                  alt=""
                  width={1400}
                  height={900}
                  sizes="(min-width: 900px) 33vw, 50vw"
                />
                {last ? (
                  <span>
                    +{rest}
                    <small>{copy.galleryRest}</small>
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {open !== null ? (
        <PhotoLightbox
          images={shots}
          index={open}
          onIndex={setOpen}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </section>
  );
}
