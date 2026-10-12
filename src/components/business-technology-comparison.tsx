"use client";

import { useState } from "react";
import Image from "next/image";
import { IconClock, IconCoins, IconInfoCircle, IconUserFilled, IconShoppingCart, IconTruck, IconShieldCheck, IconRuler2 } from "@tabler/icons-react";
import { BUSINESS } from "../lib/business-content";
import { calculateBusinessPayroll, PAYROLL_RATES } from "../lib/business-payroll";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import "./business-technology-comparison.css";

const technologies = ([
  { months: 6, margin: 10, projects: 2, annual: 20, crews: 10, supervisors: 3 },
  { months: 4, margin: 8, projects: 3, annual: 24, crews: 7, supervisors: 2 },
  { months: 2, margin: 6, projects: 6, annual: 36, crews: 4, supervisors: 2 },
  { months: 1, margin: 4, projects: 12, annual: 48, crews: 2, supervisors: 1 },
] as const).map((technology, index) => ({ ...technology, product: BUSINESS.readiness[index]! }));

// Preserve the existing illustrative model, normalized per task to manual construction = 100.
const operations = [
  { title: "Закупки", Icon: IconShoppingCart, original: [100, 60, 45, 20] },
  { title: "Логистика", Icon: IconTruck, original: [90, 40, 30, 20] },
  { title: "Проектирование", Icon: IconRuler2, original: [76, 24, 20, 12] },
  { title: "Контроль", Icon: IconShieldCheck, original: [80, 35, 20, 12] },
] as const;

function CrewFigures({ count }: { count: number }) {
  return <span className="technology-comparison__people" aria-hidden="true">{Array.from({ length: 10 }, (_, index) => <IconUserFilled key={index} className={index < count ? "is-active" : undefined} />)}</span>;
}

const rubles = (value: number) => `${new Intl.NumberFormat("ru-RU").format(value)} ₽`;

export function BusinessTechnologyComparison() {
  const [selectedTechnology, setSelectedTechnology] = useState(0);
  const technology = technologies[selectedTechnology]!;
  const loads = operations.map(({original}) => Math.round(original[selectedTechnology]! / original[0] * 100));
  const payroll = calculateBusinessPayroll(loads, technology.crews, technology.supervisors);
  return (
    <>
      <p className="technology-comparison__lead">Чем выше заводская готовность, тем меньше работ остаётся на площадке. Это создаёт условия для снижения операционных расходов и фонда оплаты труда, а также роста маржинальной прибыли компании.</p>
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
      <p className="technology-comparison__note"><IconInfoCircle size={20} aria-hidden="true" /><span>Все данные приведены в относительных величинах. N — условная единица маржинального дохода с одного объекта. Расчёты сделаны для примера и не являются публичной офертой или финансовым прогнозом. Фактические показатели зависят от конкретного проекта, региона, команды и организации процессов.</span></p>
      <div className="technology-comparison__subsection">
        <div className="technology-comparison__summary"><h3>Команда и операционная нагрузка</h3><p>Условный пример для строительства 20 домов в год.</p></div>
        <Tabs className="technology-comparison__compact" value={String(selectedTechnology)} onValueChange={value => setSelectedTechnology(Number(value))}>
          <div className="technology-comparison__tabs-divider">
            <TabsList className="technology-comparison__technology-tabs" aria-label="Технология строительства">
              {technologies.map(({product}, index) => <TabsTrigger key={product.title} value={String(index)}>{product.title === "Ручная стройка" ? "Ручная" : product.title}</TabsTrigger>)}
            </TabsList>
          </div>
          <TabsContent className="technology-comparison__technology-panel" value={String(selectedTechnology)}>
            <dl className="technology-comparison__payroll-summary">
              <div><dt>Расчётный ФОТ / мес.</dt><dd>{rubles(payroll.payroll)}</dd><span>Выплаты сотрудникам на руки</span></div>
              <div><dt>Подрядные бригады / мес.</dt><dd>{rubles(payroll.contractors)}</dd><span>{technology.crews} × {rubles(PAYROLL_RATES.contractorCrew)}</span></div>
              <div><dt>Всего по модели / мес.</dt><dd>{rubles(payroll.total)}</dd><span>Сотрудники и подрядные бригады</span></div>
            </dl>
            <div className="technology-comparison__panel-content">
              <div className="technology-comparison__crew">
                <h4>Команда на площадке</h4>
                <p className="technology-comparison__crew-count"><strong>{technology.crews}</strong><span>{technology.crews === 10 || technology.crews === 7 ? "бригад" : "бригады"}</span></p>
                <CrewFigures count={technology.crews} />
                <p className="technology-comparison__foremen">{technology.supervisors} {technology.supervisors === 1 ? "прораб" : "прораба"}</p>
                <p className="technology-comparison__figure-key">Одна фигурка — одна бригада</p>
              </div>
              <div className="technology-comparison__chart">
              <p className="technology-comparison__baseline">Относительная нагрузка · ручная стройка = 100</p>
              <div className="technology-comparison__axis" aria-hidden="true"><span>0</span><span>50</span><span>100</span></div>
              <dl className="technology-comparison__chart-rows">
                {operations.map(({title, Icon, original}) => {
                  const value = Math.round(original[selectedTechnology]! / original[0] * 100);
                  return <div className="technology-comparison__chart-row" key={title}>
                    <dt><Icon size={17} stroke={1.5} aria-hidden="true" />{title}</dt>
                    <dd><span className="technology-comparison__plot" aria-hidden="true"><span style={{ width: `${value}%` }} /></span><strong aria-label={`${value} условных единиц`}>{value}</strong></dd>
                  </div>;
                })}
              </dl>
              </div>
            </div>
            <details className="technology-comparison__payroll-details" key={selectedTechnology}>
              <summary>Как рассчитан ФОТ</summary>
              <table className="technology-comparison__payroll-table" aria-label="Расшифровка ежемесячного ФОТ">
                <thead><tr><th scope="col">Позиция</th><th scope="col">Сотрудники × ставка</th><th scope="col">В месяц</th></tr></thead>
                <tbody>{payroll.roles.map(role => <tr key={role.title}><th scope="row">{role.title}</th><td>{role.count} × {rubles(role.rate)}</td><td>{rubles(role.total)}</td></tr>)}</tbody>
                <tfoot><tr><th scope="row">Итого ФОТ</th><td /><td>{rubles(payroll.payroll)}</td></tr></tfoot>
              </table>
              <div className="technology-comparison__calculation-notes">
                <p>Один сотрудник на каждые 50 единиц нагрузки, с округлением вверх. При сумме закупок и логистики менее 50 — одна совмещённая позиция за {rubles(PAYROLL_RATES.combined)} в месяц.</p>
                <p>Ставки включают оклад и целевую премию. ФОТ здесь — сумма выплат на руки, без расчёта НДФЛ и страховых взносов. Стоимость подрядных бригад показана отдельно и не включена в ФОТ.</p>
              </div>
            </details>
        <p className="technology-comparison__legend">Условный пример, не смета: индексы показывают относительную нагрузку, а не измеренные расходы или процент экономии.</p>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
