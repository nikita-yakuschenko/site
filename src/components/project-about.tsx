import { aboutBuild, aboutIntro, copy } from "../lib/copy";
import type { CatalogProject } from "../lib/catalog/types";

/**
 * Раздел «О проекте» — слово архитектора.
 *
 * Прежде здесь стояли площадь, этажи, спальни и санузлы крупными числами
 * и снова название дома. Всё это уже сказано в первом экране: название
 * заголовком, числа — полосой характеристик под ним. Экран повторял
 * предыдущий, только беднее.
 *
 * Теперь место отдано тому, чего в первом экране нет и быть не может:
 * человеку, который объясняет проект своими словами. Слева его портрет,
 * справа сам текст.
 *
 * Портрет и подпись — заглушки: настоящие появятся вместе с текстом от
 * человека. Сам текст пока собирается из полей проекта и есть у всех 37,
 * в нём нет ни одного утверждения, которого не было бы в данных.
 */
export function ProjectAbout({ project }: { project: CatalogProject }) {
  const texts = [
    aboutIntro(project),
    aboutBuild(project.technology),
    ...project.about.map((block) => block.text),
  ];

  return (
    <section
      className="section project-about"
      aria-labelledby="project-about-title"
    >
      <div className="section__inner">
        <div className="project-about__grid">
          <figure className="project-about__portrait" aria-hidden="true">
            <span>{copy.architectPhotoHint}</span>
          </figure>
          <div className="project-about__body">
            <p className="eyebrow">{copy.aboutProject}</p>
            <h2 id="project-about-title">{copy.architectHeading}</h2>
            <div className="project-about__text">
              {texts.map((text) => (
                <p key={text}>{text}</p>
              ))}
            </div>
            <p className="project-about__sign">
              <strong>{copy.architectName}</strong>
              <span>{copy.architectRole}</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
