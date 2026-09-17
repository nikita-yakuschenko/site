"use client";

import {
  IconDisabled,
  IconBabyCarriage,
  IconHomeHeart,
  IconUsersGroup,
} from "@tabler/icons-react";
import type { ComponentType } from "react";
import { nbspText } from "../lib/copy";
import type { WithWho } from "../lib/mortgage/content";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";

const WHO_ICONS: ComponentType<{
  size?: number;
  stroke?: number;
  "aria-hidden"?: boolean;
}>[] = [IconBabyCarriage, IconUsersGroup, IconDisabled];

/**
 * Кому подходит программа.
 *
 * В разделе две разные по природе вещи, и раньше они выглядели одинаково —
 * шесть плашек подряд, разделённых только оттенком заливки.
 *
 * Условий три, и достаточно любого. Поэтому они собраны в одну плашку:
 * общая рамка говорит «это один выбор», а не три требования подряд.
 * Между ячейками стоит «или» — то же самое, что в лиде, но там, где глаз
 * читает структуру, а не текст. Знаки выстроены в ряд по верху, под ними
 * формулировки: сколько бы строк ни заняла любая из них, начинаются они
 * на одной линии — выравнивание держит сетка, а не подбор отступов.
 *
 * Правила действуют всегда, их читают не все и не сразу, и каждое — абзац
 * на полсотни слов. Это аккордеон: первое открыто, остальные в одном
 * нажатии. Разное поведение отделяет их от условий надёжнее, чем разный
 * серый.
 */
export function MortgageWhoFits({ content }: { content: WithWho }) {
  return (
    <section className="section" aria-labelledby="mortgage-who-title">
      <div className="section__inner">
        <p className="eyebrow">{content.whoEyebrow}</p>
        <h2 id="mortgage-who-title">{content.whoHeading}</h2>
        <p className="mortgage-page__lead">{nbspText(content.whoLead)}</p>

        <ul className="mortgage-who">
          {content.whoFits.map((item, index) => {
            const Icon = WHO_ICONS[index] ?? IconHomeHeart;
            return (
              <li key={item.title}>
                <span className="mortgage-who__icon" aria-hidden="true">
                  <Icon size={32} stroke={1.6} />
                </span>
                <strong>{nbspText(item.title)}</strong>
              </li>
            );
          })}
        </ul>

        <div className="mortgage-who__rules">
          <h3 className="mortgage-rules__title">{content.rulesHeading}</h3>
          <Accordion
            type="single"
            collapsible
            className="ui-accordion mortgage-rules"
            defaultValue="rule-0"
          >
            {content.rules.map((rule, index) => (
              <AccordionItem key={rule.title} value={`rule-${index}`}>
                <AccordionTrigger>{rule.title}</AccordionTrigger>
                <AccordionContent>{nbspText(rule.text)}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
