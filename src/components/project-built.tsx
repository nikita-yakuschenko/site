"use client";

import Image from "next/image";
import { useState } from "react";
import { copy } from "../lib/copy";
import { PhotoLightbox } from "./photo-lightbox";
import { VideoLightbox, reviewEmbedSrc } from "./video-lightbox";
import type { CatalogProject } from "../lib/catalog/types";

/**
 * Построенные дома.
 *
 * Весь раздел выше — рендеры: так дом задуман. Здесь он снят на участке,
 * в своём посёлке и погоде, и именно это отвечает на вопрос «а в жизни
 * он такой же». Поэтому раздел стоит последним перед комплектацией: он
 * закрывает сомнение прямо перед разговором о деньгах.
 *
 * Здесь же видеообзор: он отвечает на тот же вопрос, только подробнее —
 * и потому идёт широким кадром во всю ширину, а не прячется отдельной
 * кнопкой. Снимки под ним лежат лентой: они сняты в разных посёлках, и
 * листать их уместнее, чем раскладывать очередной сеткой — третьей
 * подряд на этой странице.
 *
 * Снимков у проекта может не быть — тогда раздела нет. Подставлять сюда
 * рендеры нельзя: это ровно то, чего раздел не должен делать.
 */
/** Сколько снимков стоит в ряду. Четыре — ровно ширина страницы на
 *  десктопе; остальное прячется за последней плиткой. */
const STRIP_TILES = 4;

export function ProjectBuilt({ project }: { project: CatalogProject }) {
  const shots = project.built ?? [];
  const tour = project.builtTour;
  const [open, setOpen] = useState<number | null>(null);
  const [tourOpen, setTourOpen] = useState(false);
  if (!shots.length && !tour) return null;

  const images = shots.map((shot) => shot.image);
  const captions = shots.map((shot) => shot.caption ?? "");
  const tiles = shots.slice(0, STRIP_TILES);
  const rest = shots.length - tiles.length;

  return (
    <section className="section" aria-labelledby="project-built-title">
      <div className="section__inner">
        <h2 id="project-built-title">
          Как {project.name} выглядит в жизни
        </h2>
        {tour ? (
          <button
            type="button"
            className="project-built__stage project-built__tour"
            onClick={() => setTourOpen(true)}
          >
            <Image
              src={tour.cover}
              alt=""
              width={1920}
              height={824}
              sizes="100vw"
            />
            {/* Треугольник нарисован здесь, а не взят из набора: у значка
                из набора он уже смещён вправо, и вместе с полем у круга
                компенсация шла дважды — знак выглядел сбитым.

                Основание на 9, вершина на 18.5: центр тяжести треугольника
                лежит в трети от основания, то есть ровно в центре круга.
                Именно он, а не рамка знака, должен совпадать с центром. */}
            <span className="project-built__play">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 6.5 18.5 12 9 17.5z" fill="currentColor" />
              </svg>
            </span>
            <span className="project-built__tour-label">
              {tour.title ?? copy.builtTour}
            </span>
          </button>
        ) : null}

        {shots.length ? (
          <div className="project-strip">
            {tiles.map((shot, index) => {
              const last = rest > 0 && index === tiles.length - 1;
              return (
                <button
                  key={shot.image}
                  type="button"
                  className={last ? "project-rows__rest" : undefined}
                  aria-label={
                    last ? `${copy.galleryRest} ${rest}` : copy.galleryOpen
                  }
                  onClick={() => setOpen(index)}
                >
                  <Image
                    src={shot.image}
                    alt=""
                    width={1200}
                    height={675}
                    sizes="(min-width: 900px) 25vw, 60vw"
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
        ) : null}
      </div>

      {tourOpen && tour ? (
        <VideoLightbox
          title={tour.title ?? copy.builtTour}
          embedSrc={reviewEmbedSrc(tour.video)}
          onClose={() => setTourOpen(false)}
        />
      ) : null}

      {open !== null ? (
        <PhotoLightbox
          images={images}
          labels={captions}
          index={open}
          onIndex={setOpen}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </section>
  );
}
