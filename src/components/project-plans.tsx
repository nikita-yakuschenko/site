"use client";

import Image from "next/image";
import { useState } from "react";
import { PhotoLightbox } from "./photo-lightbox";
import { copy } from "../lib/copy";
import type { CatalogProject } from "../lib/catalog/types";

/**
 * Планировка.
 *
 * Планы одного дома — это чаще не этажи, а варианты расстановки: коробка
 * та же, состав комнат разный. Поэтому они не выкладываются рядом, а
 * переключаются: сравнивать варианты имеет смысл на одном месте, глядя на
 * одну и ту же коробку.
 *
 * Рядом с чертежом — экспликация. Чертёж отвечает на вопрос «как
 * устроено», список — «сколько чего»; на самом чертеже подписи мелкие, и
 * читать по ним площади неудобно.
 *
 * Чертёж открывается во весь экран: подписи на нём мелкие, и на ширине
 * колонки их не прочитать.
 *
 * Экспликация есть не у всех проектов: её приходится снимать с чертежа
 * руками. Где её нет, раздел показывает планы картинками — без списка, но
 * и без выдуманных цифр.
 */
export function ProjectPlans({ project }: { project: CatalogProject }) {
  const variants = project.plans ?? [];
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState<number | null>(null);

  if (!variants.length) {
    if (!project.floorPlans.length) return null;
    return (
      <section
        className="section section--muted"
        aria-labelledby="project-plans-title"
      >
        <div className="section__inner">
          <p className="eyebrow">{copy.plansEyebrow}</p>
          <h2 id="project-plans-title">{copy.plansHeading}</h2>
          <div className="project-plans">
            {project.floorPlans.map((src, index) => (
              <button
                key={src}
                type="button"
                aria-label={copy.galleryOpen}
                onClick={() => setOpen(index)}
              >
                <Image
                  src={src}
                  alt={copy.plansHeading}
                  width={1600}
                  height={1200}
                  sizes="(min-width: 900px) 50vw, 100vw"
                />
              </button>
            ))}
          </div>
        </div>

        {open !== null ? (
          <PhotoLightbox
            images={project.floorPlans}
            index={open}
            onIndex={setOpen}
            onClose={() => setOpen(null)}
          />
        ) : null}
      </section>
    );
  }

  const current = variants[active] ?? variants[0]!;

  return (
    <section
      className="section section--muted"
      aria-labelledby="project-plans-title"
    >
      <div className="section__inner">
        <p className="eyebrow">{copy.plansEyebrow}</p>
        <h2 id="project-plans-title">{copy.plansHeading}</h2>

        {variants.length > 1 ? (
          <div className="project-plans__tabs" role="tablist" aria-label="Варианты планировки">
            {variants.map((variant, index) => (
              <button
                key={variant.label}
                type="button"
                role="tab"
                aria-selected={index === active}
                className={
                  index === active
                    ? "project-plans__tab project-plans__tab--on"
                    : "project-plans__tab"
                }
                onClick={() => setActive(index)}
              >
                {variant.label}
              </button>
            ))}
          </div>
        ) : null}

        <div className="project-plans__body">
          <button
            type="button"
            className="project-plans__sheet"
            aria-label={copy.galleryOpen}
            onClick={() => setOpen(active)}
          >
            <Image
              key={current.image}
              src={current.image}
              alt={`${copy.plansHeading}: ${current.label}`}
              width={1680}
              height={1188}
              sizes="(min-width: 900px) 62vw, 100vw"
            />
          </button>

          <div className="project-plans__legend">
            <p className="project-plans__legend-title">{copy.plansLegend}</p>
            <dl>
              {current.rooms.map((room, index) => (
                <div key={`${room.name}-${index}`}>
                  <dt>{room.name}</dt>
                  <dd>{room.area}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {/* Листаем варианты того же дома: их и показывает просмотр. */}
      {open !== null ? (
        <PhotoLightbox
          images={variants.map((variant) => variant.image)}
          labels={variants.map((variant) => variant.label)}
          variantLabels={variants.map((variant) => variant.label)}
          index={open}
          onIndex={(next) => {
            setOpen(next);
            setActive(next);
          }}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </section>
  );
}
