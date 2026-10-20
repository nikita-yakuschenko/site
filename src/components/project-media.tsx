"use client";

import Image from "next/image";
import { optimizableMedia } from '../lib/media';
import { useEffect, useState } from "react";
import { isHeroImage } from "../lib/catalog/project-hero-data";
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
 * В сетке видно не больше шести плиток: у фасадов первая крупная и пять
 * мелких, у интерьеров — ровный ряд. Если снимков больше, последняя плитка
 * пишет «+N ещё фото» и открывает полный просмотр.
 *
 * Форма у него своя: ровная сетка на тёмном фоне. Фасады, интерьеры и
 * построенные дома шли тремя одинаковыми бенто подряд и читались одним
 * полотном; к тому же крупный кадр здесь не нужен — это варианты
 * отделки, среди них нет главного.
 *
 * Интерьеры есть не у всех проектов, и раздел просто не выводится: пустой
 * заголовок хуже отсутствия.
 */

/** Сколько плиток видно в сетке. Первая — крупная, ещё пять мелких;
 *  остальное прячется за подписью «+N ещё фото» на последней. */
const GALLERY_TILES = 6;

function useGalleryImages(gallery: 'exteriors' | 'interiors', connected: boolean, images: string[]) {
  const [draft, setDraft] = useState<string[] | null>(null);
  useEffect(() => {
    if (!connected || window.parent === window || !new URLSearchParams(window.location.search).has('cmsPreview')) return;
    const allowed = new Set(['http://localhost:3001', 'https://cms.avgst.ru']);
    const receive = (event: MessageEvent) => {
      if (event.source === window.parent && allowed.has(event.origin) && event.data?.type === `avgst:preview-${gallery}` && Array.isArray(event.data.images) && event.data.images.every(isHeroImage)) setDraft(event.data.images);
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [connected, gallery]);
  return draft ?? images;
}

/** Фасады. Первый кадр крупный: ряд одинаковых прямоугольников не
 *  говорит, какой из них главный. */
export function ProjectExteriors({ project, images, connected = false }: { project: CatalogProject; images?: string[]; connected?: boolean }) {
  const shots = useGalleryImages('exteriors', connected, images ?? project.exteriors);
  const [open, setOpen] = useState<number | null>(null);
  if (!shots.length) return null;

  const tiles = shots.slice(0, GALLERY_TILES);
  const rest = shots.length - tiles.length;

  return (
    <section className="section" data-cms-block="ProjectExteriors" aria-labelledby="project-exteriors-title">
      <div className="section__inner">
        <h2 id="project-exteriors-title" data-cms-block="ProjectExteriors.heading">
          {project.readyHome ? "Дом снаружи" : copy.exteriorsHeading}
        </h2>
        <div className="project-bento" data-cms-block="ProjectExteriors.gallery">
          {tiles.map((src, index) => {
            const last = rest > 0 && index === tiles.length - 1;
            const classes = [
              index === 0 ? "project-bento__lead" : "",
              last ? "project-bento__rest" : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <button
                key={`${src}-${index}`}
                type="button"
                className={classes || undefined}
                aria-label={
                  last ? `${copy.galleryRest} ${rest}` : copy.galleryOpen
                }
                onClick={() => setOpen(index)}
              >
                <Image
                  src={src}
                  unoptimized={!optimizableMedia(src)}
                  alt=""
                  width={1600}
                  height={1000}
                  sizes={
                    index === 0 ? "(min-width: 900px) 66vw, 100vw" : "33vw"
                  }
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

      {open !== null && open < shots.length ? (
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
export function ProjectInteriors({ project, images, connected = false }: { project: CatalogProject; images?: string[]; connected?: boolean }) {
  const shots = useGalleryImages('interiors', connected, images ?? project.interiors);
  const [open, setOpen] = useState<number | null>(null);
  if (!shots.length) return null;

  const tiles = shots.slice(0, GALLERY_TILES);
  const rest = shots.length - tiles.length;

  return (
    <section
      className="section section--ink"
      data-cms-block="ProjectInteriors"
      aria-labelledby="project-interiors-title"
    >
      <div className="section__inner">
        <h2 id="project-interiors-title" data-cms-block="ProjectInteriors.heading">
          {project.readyHome ? "Интерьер готового дома" : copy.interiorsHeading}
        </h2>
        <div className="project-rows" data-cms-block="ProjectInteriors.gallery">
          {tiles.map((src, index) => {
            const last = rest > 0 && index === tiles.length - 1;
            const cls = last ? "project-rows__rest" : "";
            return (
              <button
                key={`${src}-${index}`}
                type="button"
                className={cls || undefined}
                aria-label={last ? `${copy.galleryRest} ${rest}` : copy.galleryOpen}
                onClick={() => setOpen(index)}
              >
                <Image
                  src={src}
                  alt=""
                  width={1400}
                  unoptimized={!optimizableMedia(src)}
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

      {open !== null && open < shots.length ? (
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
