import { aboutBuild, aboutIntro, copy } from "../lib/copy";
import type { CatalogProject } from "../lib/catalog/types";

/**
 * Раздел «О проекте».
 *
 * Шахматка из четырёх прямоугольников: в первом ряду текст и кадр, во
 * втором кадр и текст. Диагональ из текстовых карточек ведёт взгляд слева
 * направо и вниз, и блок читается рассказом, а не таблицей.
 *
 * Расстановка задана жёстко и не зависит от того, сколько текстов
 * написано: место без текста занимает кадр. Схлопывать сетку нельзя, иначе
 * от шахматки остаётся текст слева и картинка справа.
 *
 * Первый абзац собирается из полей проекта и есть у всех 37: в нём нет ни
 * одного утверждения, которого не было бы в данных. Остальные приходят из
 * project.about и пишутся руками.
 */

/* Порядок мест по рядам: текст, кадр, кадр, текст. */
const SLOTS = ["card", "photo", "photo", "card"] as const;

export function ProjectAbout({ project }: { project: CatalogProject }) {
  /* Два абзаца собираются из данных и потому есть у всех 37 проектов.
     Именно они и держат шахматку: с одним текстом чередоваться нечему, и
     от неё остаётся карточка и три фотографии. */
  const texts = [
    { title: copy.aboutProject, text: aboutIntro(project) },
    { title: copy.aboutBuild, text: aboutBuild(project.technology) },
    ...project.about.map((block) => ({ title: block.title, text: block.text })),
  ];

  const photos = project.exteriors;
  if (!photos.length) return null;

  /* Места раздаются одним проходом, без счётчиков снаружи: у каждого места
     заранее известно, какое оно по счёту, и по этому номеру берётся
     содержимое. Нет текста — берём кадр. */
  const tiles = SLOTS.map((kind, index) => {
    const cardsBefore = SLOTS.slice(0, index).filter((s) => s === "card").length;
    const text = kind === "card" ? texts[cardsBefore] : undefined;
    if (text) return { kind: "card" as const, ...text };
    const taken = SLOTS.slice(0, index).filter((s, i) => {
      if (s === "photo") return true;
      const before = SLOTS.slice(0, i).filter((x) => x === "card").length;
      return !texts[before];
    }).length;
    return { kind: "photo" as const, src: photos[taken % photos.length] };
  });

  return (
    <section className="section project-about">
      <div className="section__inner">
        <div className="project-about__grid">
          {tiles.map((tile, index) =>
            tile.kind === "card" ? (
              <div key={index} className="project-about__card">
                <h2>{tile.title}</h2>
                <p>{tile.text}</p>
              </div>
            ) : (
              <div key={index} className="project-about__photo">
                <img src={tile.src} alt="" loading="lazy" decoding="async" />
              </div>
            ),
          )}
        </div>
      </div>
    </section>
  );
}
