"use client";

import { IconArrowUpRight, IconCheck } from "@tabler/icons-react";
import { useState } from "react";
import { copy } from "../lib/copy";
import { formatFromRub, formatRub } from "../lib/locale";
import { tiersForProject } from "../lib/catalog/tiers";
import type { CatalogProject } from "../lib/catalog/types";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";

/**
 * Комплектация.
 *
 * Дом продаётся готовыми наборами, поэтому раздел даёт выбрать уровень, а
 * не собирать дом из галочек. Состав перечислен прямо в карточке: разницу
 * между уровнями видно списком, а не описанием. Подробности о материалах
 * — в аккордеоне, тем же, что на страницах ипотеки.
 *
 * Итог липнет к верху: список длиннее панели, и цена должна оставаться на
 * экране, пока по нему идут.
 *
 * Платёж считается здесь же, на клиенте: он меняется вместе с выбором, а
 * серверное значение в шапке относится к базовой цене проекта.
 */
export function ProjectConfig({
  project,
  /** Платёж по базовой цене — из него берётся ставка: считать её второй
   *  раз в компоненте значило бы завести вторую правду о программе. */
  basePayment,
}: {
  project: CatalogProject;
  basePayment: number | null;
}) {
  const tiers = tiersForProject(project);
  const [tierId, setTierId] = useState("standard");

  if (!tiers) return null;
  const tier = tiers.find((item) => item.id === tierId) ?? tiers[1]!;

  /* Платёж пропорционален цене: при одной ставке, взносе и сроке аннуитет
     линеен по сумме кредита. */
  const monthly =
    basePayment && project.priceAmount
      ? Math.round((basePayment * tier.price) / project.priceAmount)
      : null;

  return (
    <section
      className="section section--muted"
      aria-labelledby="project-config-title"
    >
      <div className="section__inner">
        <p className="eyebrow">{copy.configurator}</p>
        <h2 id="project-config-title">{copy.configHeading}</h2>

        <div className="project-config">
          <div>
            <ul className="project-config__tiers">
              {tiers.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={
                      item.id === tier.id
                        ? "project-config__tier project-config__tier--on"
                        : "project-config__tier"
                    }
                    aria-pressed={item.id === tier.id}
                    onClick={() => setTierId(item.id)}
                  >
                    <span className="project-config__tier-name">
                      {item.name}
                    </span>
                    <span className="project-config__tier-lead">
                      {item.lead}
                    </span>
                    <span className="project-config__tier-price">
                      {formatFromRub(item.price)}
                    </span>
                    <span className="project-config__tier-list">
                      {item.includes.map((line) => (
                        <span key={line}>
                          <IconCheck size={14} stroke={2.4} aria-hidden="true" />
                          {line}
                        </span>
                      ))}
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            <h3 className="project-config__details-title">
              {copy.configDetails}
            </h3>
            <Accordion type="multiple" className="ui-accordion">
              {tier.details.map((detail) => (
                <AccordionItem
                  key={detail.title}
                  value={`${tier.id}-${detail.title}`}
                >
                  <AccordionTrigger>{detail.title}</AccordionTrigger>
                  <AccordionContent>{detail.text}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          <aside className="project-config__total">
            <p className="project-config__total-label">
              {tier.name} {copy.configTierWord}
            </p>
            <p className="project-config__total-sum">{formatRub(tier.price)}</p>
            {monthly ? (
              <p className="project-config__total-pay">
                {formatRub(monthly)} {copy.configPerMonth}
                <span>{copy.configPayNote}</span>
              </p>
            ) : null}
            <a className="btn btn-yellow" href="#contacts">
              {copy.getQuote}
              <IconArrowUpRight size={16} stroke={2} aria-hidden="true" />
            </a>
            <p className="project-config__total-note">{copy.configPriceNote}</p>
          </aside>
        </div>
      </div>
    </section>
  );
}
