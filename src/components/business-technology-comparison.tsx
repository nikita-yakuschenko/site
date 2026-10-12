"use client";

import { useState } from "react";
import Image from "next/image";
import { IconClock, IconCoins, IconInfoCircle, IconShoppingCart, IconTruck, IconShieldCheck, IconRuler2 } from "@tabler/icons-react";
import { BUSINESS } from "../lib/business-content";
import { calculateBusinessPayroll } from "../lib/business-payroll";
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

const formatAmount = (value: number) => new Intl.NumberFormat("ru-RU").format(value);

export function BusinessTechnologyComparison() {
  const [selectedTechnology, setSelectedTechnology] = useState(0);
  const technology = technologies[selectedTechnology]!;
  const loads = operations.map(({original}) => Math.round(original[selectedTechnology]! / original[0] * 100));
  const payroll = calculateBusinessPayroll(loads, technology.supervisors);
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
        <div className="technology-comparison__summary"><h3>Команда и операционная нагрузка</h3></div>
        <p className="technology-comparison__context"><IconInfoCircle size={20} aria-hidden="true" /><span>Сравнение рассчитано для строительства 20 домов в год. За 100% принята операционная нагрузка при ручной стройке; показатели остальных технологий приведены относительно этой базы.</span></p>
        <Tabs className="technology-comparison__compact" value={String(selectedTechnology)} onValueChange={value => setSelectedTechnology(Number(value))}>
          <div className="technology-comparison__tabs-divider">
            <TabsList className="technology-comparison__technology-tabs" aria-label="Технология строительства">
              {technologies.map(({product}, index) => <TabsTrigger key={product.title} value={String(index)}>{product.title === "Ручная стройка" ? "Ручная" : product.title}</TabsTrigger>)}
            </TabsList>
          </div>
          <TabsContent className="technology-comparison__technology-panel" value={String(selectedTechnology)}>
            <div className="technology-comparison__panel-content">
              <div className="technology-comparison__crew">
                <div className="technology-comparison__group-heading"><h4>Команда</h4><span>{technology.crews} {technology.crews === 10 || technology.crews === 7 ? "бригад" : "бригады"}</span></div>
                <table className="technology-comparison__team-table" aria-label="Состав команды и ежемесячный ФОТ">
                  <thead><tr><th scope="col">Сотрудники</th><th scope="col" aria-label="Количество сотрудников">Чел.</th><th scope="col">ФОТ / мес.</th></tr></thead>
                  <tbody>
                    {payroll.roles.map(role => <tr key={role.title}><th scope="row">{role.title}</th><td>{role.count}</td><td>{formatAmount(role.total)}</td></tr>)}
                    {Array.from({ length: 5 - payroll.roles.length }, (_, index) => <tr className="technology-comparison__team-spacer" aria-hidden="true" key={`spacer-${index}`}><td colSpan={3} /></tr>)}
                  </tbody>
                  <tfoot><tr><th scope="row" colSpan={2}>Итого ФОТ</th><td>{formatAmount(payroll.payroll)}</td></tr></tfoot>
                </table>
              </div>
              <div className="technology-comparison__chart">
              <div className="technology-comparison__group-heading"><h4>Операционная нагрузка</h4></div>
              <div className="technology-comparison__axis" aria-hidden="true"><span>0%</span><span>50%</span><span>100%</span></div>
              <dl className="technology-comparison__chart-rows">
                {operations.map(({title, Icon, original}) => {
                  const value = Math.round(original[selectedTechnology]! / original[0] * 100);
                  return <div className="technology-comparison__chart-row" key={title}>
                    <dt><Icon size={17} stroke={1.5} aria-hidden="true" />{title}</dt>
                    <dd><span className="technology-comparison__plot" aria-hidden="true"><span style={{ width: `${value}%` }} /></span><strong>{value}%</strong></dd>
                  </div>;
                })}
              </dl>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        <p className="technology-comparison__salary-source">Зарплаты: усреднённые значения из исследований HH.ru, SuperJob и Авито Работа.</p>
        <p className="technology-comparison__scope">Расходы на бэкофис — бухгалтерию, маркетинг, юридическое сопровождение и HR — не включены. Пример служит для сравнения технологий и не заменяет финансовую модель конкретного бизнеса.</p>
      </div>
    </>
  );
}
