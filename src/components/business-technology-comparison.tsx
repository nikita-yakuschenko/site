import Image from "next/image";
import { IconClock, IconCoins, IconUsersGroup, IconUserFilled, IconShoppingCart, IconTruck, IconShieldCheck, IconFileText, IconInfoCircle } from "@tabler/icons-react";
import { BUSINESS } from "../lib/business-content";
import "./business-technology-comparison.css";

const technologies = ([
  { months: 6, margin: 10, projects: 2, annual: 20, crews: 10, supervisors: "2–3 прораба", load: [100, 90, 80, 76] },
  { months: 4, margin: 8, projects: 3, annual: 24, crews: 7, supervisors: "2 прораба", load: [60, 40, 35, 24] },
  { months: 2, margin: 6, projects: 6, annual: 36, crews: 4, supervisors: "2 прораба", load: [45, 30, 20, 20] },
  { months: 1, margin: 4, projects: 12, annual: 48, crews: 2, supervisors: "1 прораб", load: [20, 20, 12, 12] },
] as const).map((technology, index) => ({ ...technology, product: BUSINESS.readiness[index]! }));
const tasks = [
  { title: "Закупки", Icon: IconShoppingCart },
  { title: "Логистика", Icon: IconTruck },
  { title: "Контроль", Icon: IconShieldCheck },
  { title: "Документация", Icon: IconFileText },
] as const;

export function BusinessTechnologyComparison() {
  return (
    <>
      <p className="technology-comparison__lead">Чем выше заводская готовность, тем быстрее вы завершаете объекты, возвращаете капитал в оборот и можете выполнять больше проектов тем же или меньшим количеством людей.</p>
      <div className="technology-comparison__cards">
        {technologies.map((technology) => {
          const product = technology.product;
          return (
            <article className="technology-card" key={product.title}>
              <div className="technology-card__intro">
                <div className={`technology-card__image${product.title === "Префаб" ? " technology-card__image--prefab" : ""}`}><Image src={product.image} alt="" fill sizes="(max-width: 599px) 80vw, (max-width: 1023px) 42vw, 260px" /></div>
                <h3>{product.title}</h3>
              </div>
              <div className="technology-card__duration" aria-label="Срок строительства">
                <strong><IconClock size={20} stroke={1.5} aria-hidden="true" /><span className="technology-card__duration-value">{technology.months} <span>мес.</span><span className="technology-card__per-object"> / объект</span></span></strong>
                <div className="technology-comparison__bar" aria-hidden="true"><span style={{ width: `${technology.months / 8 * 100}%` }} /></div>
              </div>
              <dl className="technology-card__metrics">
                <div><dt>Маржинальный<br />доход&nbsp;с&nbsp;объекта</dt><dd>{technology.margin}N</dd></div>
                <div><dt>Объектов за&nbsp;год<br />на&nbsp;бригаду</dt><dd>{technology.projects}</dd></div>
              </dl>
              <div className="technology-card__annual">
                <p>Маржинальный доход компании<br />за&nbsp;год при&nbsp;работе одной&nbsp;бригады</p>
                <div className="technology-card__annual-value"><IconCoins size={26} stroke={1.5} aria-hidden="true" /><strong>{technology.annual}N</strong></div>
              </div>
            </article>
          );
        })}
      </div>
      <div className="technology-comparison__subsection">
        <div className="technology-comparison__summary"><h3>Сколько бригад нужно, чтобы построить 20 домов в год?</h3><p>Чем выше заводская готовность, тем меньше бригад и прорабов требуется для того же объёма строительства.</p></div>
        <div className="technology-comparison__strip">
          <table className="technology-comparison__table" aria-label="Команда для строительства 20 домов в год">
            <thead><tr><td />{technologies.map(technology => <th scope="col" key={technology.product.title}><span><IconUsersGroup size={20} aria-hidden="true" />{technology.product.title}</span></th>)}</tr></thead>
            <tbody><tr>
              <th scope="row">Бригады и прорабы</th>
              {technologies.map(technology => <td key={technology.product.title}>
                <div className="technology-comparison__crew-count"><strong>{technology.crews}</strong><div><b>{technology.crews >= 5 ? "бригад" : "бригады"}</b><p>и {technology.supervisors}</p></div></div>
                <div className="technology-comparison__people" aria-hidden="true">{Array.from({ length: 12 }, (_, person) => <IconUserFilled key={person} className={person < technology.crews ? "is-active" : undefined} />)}</div>
              </td>)}
            </tr></tbody>
          </table>
        </div>
      </div>
      <div className="technology-comparison__subsection">
        <div className="technology-comparison__summary"><h3>Меньше задач на площадке, проще управление</h3><p>С увеличением заводской готовности часть задач снабжения, логистики, контроля и подготовки документации переносится на производственный процесс.</p></div>
        <div className="technology-comparison__strip">
          <table className="technology-comparison__table" aria-label="Относительная нагрузка на площадке по технологиям">
            <thead><tr><td />{technologies.map(technology => <th scope="col" key={technology.product.title}><span><IconUsersGroup size={20} aria-hidden="true" />{technology.product.title}</span></th>)}</tr></thead>
            <tbody>{tasks.map(({ title, Icon }, task) => <tr key={title}>
              <th scope="row"><span><Icon size={16} aria-hidden="true" />{title}</span></th>
              {technologies.map(technology => <td key={technology.product.title}><div className="technology-comparison__bar" role="img" aria-label={`${technology.load[task]} из 100`}><span style={{ width: `${technology.load[task]}%` }} /></div></td>)}
            </tr>)}</tbody>
          </table>
        </div>
      </div>
      <p className="technology-comparison__note"><IconInfoCircle size={20} aria-hidden="true" /><span>Все данные приведены в относительных величинах. N — условная единица маржинального дохода с одного объекта. Расчёты сделаны для примера и не являются публичной офертой или финансовым прогнозом. Фактические показатели зависят от конкретного проекта, региона, команды и организации процессов.</span></p>
    </>
  );
}
