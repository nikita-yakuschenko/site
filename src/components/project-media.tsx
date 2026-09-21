import Image from "next/image";
import { copy } from "../lib/copy";
import type { CatalogProject } from "../lib/catalog/types";

/**
 * Фасады, планировки и интерьеры — три раздела вместо одной ленты.
 *
 * Прежде страница показывала весь список кадров подряд: планировки,
 * фасады и комнаты вперемешку под заголовком «Фасады». Разложить их было
 * нечем — в каталоге все снимки лежали одним полем. Теперь раскладка есть,
 * и каждый раздел показывает своё.
 *
 * Интерьеры есть не у всех проектов, и раздел просто не выводится: пустой
 * заголовок хуже отсутствия.
 */

/** Фасады. Первый кадр крупный: ряд одинаковых прямоугольников не
 *  говорит, какой из них главный. */
export function ProjectExteriors({ project }: { project: CatalogProject }) {
  if (!project.exteriors.length) return null;
  return (
    <section className="section" aria-labelledby="project-exteriors-title">
      <div className="section__inner">
        <p className="eyebrow">{copy.exteriors}</p>
        <h2 id="project-exteriors-title">{copy.exteriorsHeading}</h2>
        <div className="project-bento">
          {project.exteriors.map((src, index) => (
            <figure key={src} className={index === 0 ? "project-bento__lead" : ""}>
              <Image
                src={src}
                alt=""
                width={1600}
                height={1000}
                sizes={index === 0 ? "(min-width: 900px) 66vw, 100vw" : "33vw"}
              />
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Интерьеры. */
export function ProjectInteriors({ project }: { project: CatalogProject }) {
  if (!project.interiors.length) return null;
  return (
    <section className="section" aria-labelledby="project-interiors-title">
      <div className="section__inner">
        <p className="eyebrow">{copy.interiorsEyebrow}</p>
        <h2 id="project-interiors-title">{copy.interiorsHeading}</h2>
        <div className="project-shots">
          {project.interiors.map((src) => (
            <figure key={src}>
              <Image
                src={src}
                alt=""
                width={1400}
                height={1000}
                sizes="(min-width: 900px) 33vw, 50vw"
              />
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
