"use client";

import Image from "next/image";
import { Fragment } from "react";
import { nbspText } from "../lib/copy";
import type { WithWho } from "../lib/mortgage/content";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";

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
            return (
              <Fragment key={item.title}>
                {/* «Или» — своя ячейка сетки, а не знак внутри плашки:
                    плашка обрезает кадр по кромке, и абсолютный значок
                    срезался вместе с ним. */}
                {index > 0 ? (
                  <li className="mortgage-who__or" aria-hidden="true">
                    {content.whoJoiner}
                  </li>
                ) : null}
                <li className="mortgage-program mortgage-who__card">
                  <span>{nbspText(item.label)}</span>
                  <strong>{nbspText(item.title)}</strong>
                  <small>{nbspText(item.note)}</small>
                  <Image
                    className="mortgage-program__art"
                    src={item.image}
                    alt=""
                    width={item.imageW}
                    height={item.imageH}
                    sizes={item.sizes}
                  />
                </li>
              </Fragment>
            );
          })}
        </ul>

        <div className="mortgage-who__rules">
          <h3 className="mortgage-rules__title">{content.rulesHeading}</h3>
          {/* Несколько правил открытыми одновременно: это не вопросы, где
              читают одно, а условия, которые сверяют между собой. */}
          <Accordion type="multiple" className="ui-accordion mortgage-rules">
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
