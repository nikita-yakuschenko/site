"use client";

import { IconInfoCircle } from "@tabler/icons-react";
import Image from "next/image";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { nbspText } from "../lib/copy";
import type { WithWho } from "../lib/mortgage/content";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";

/** Сколько подсветка держится, прежде чем погаснуть. */
const HIGHLIGHT_MS = 2600;

/**
 * Кому подходит программа.
 *
 * В разделе две разные по природе вещи, и раньше они выглядели одинаково —
 * шесть плашек подряд, разделённых только оттенком заливки.
 *
 * Условия наверху, правила под ними. Условий три: у семейной достаточно
 * любого, и между плашками стоит «или»; у IT они выполняются вместе, и
 * разделителя нет вовсе.
 *
 * Правила действуют всегда, их читают не все и не сразу, и каждое — абзац
 * на полсотни слов. Это аккордеон: первое открыто, остальные в одном
 * нажатии. Разное поведение отделяет их от условий надёжнее, чем разный
 * серый.
 *
 * Условие, у которого подробности вынесены в правило, само ведёт к нему:
 * плашка нажимается, правило раскрывается, и в нём загорается та самая
 * формулировка. Иначе связь между «90 / 150 тыс.» наверху и абзацем про
 * пороги дохода внизу существует только в голове у того, кто её писал.
 */
export function MortgageWhoFits({ content }: { content: WithWho }) {
  const ruleIds = content.rules.map((rule, index) => rule.id ?? `rule-${index}`);

  /* Аккордеон управляемый: плашка условия открывает правило, а не только
     сам заголовок. Первое правило раскрыто, как и во всех списках. */
  const [openRules, setOpenRules] = useState<string[]>(() =>
    ruleIds[0] ? [ruleIds[0]] : [],
  );
  const [litRule, setLitRule] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  const items = useRef(new Map<string, HTMLDivElement | null>());

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  const openAndLight = useCallback((ruleId: string) => {
    setOpenRules((current) =>
      current.includes(ruleId) ? current : [...current, ruleId],
    );

    /* Подсветка снимается и зажигается заново: при повторном нажатии на ту
       же плашку класс уже висел бы, и мазок не проигрался бы. */
    setLitRule(null);
    if (timer.current) window.clearTimeout(timer.current);
    window.requestAnimationFrame(() => setLitRule(ruleId));
    timer.current = window.setTimeout(() => setLitRule(null), HIGHLIGHT_MS);

    /* Прокрутка — только если правила нет на экране. На широком он обычно
       виден, и дёргать страницу незачем; на узком плашки и правила
       разнесены на экран-другой. Ждём кадр: правило раскрывается, и до
       перерисовки его высота ещё прежняя. */
    window.requestAnimationFrame(() => {
      const node = items.current.get(ruleId);
      if (!node) return;
      const box = node.getBoundingClientRect();
      const visible = box.top >= 0 && box.bottom <= window.innerHeight;
      if (visible) return;
      const motionOk = !window.matchMedia("(prefers-reduced-motion: reduce)")
        .matches;
      node.scrollIntoView({
        behavior: motionOk ? "smooth" : "auto",
        block: "center",
      });
    });
  }, []);

  return (
    <section className="section" aria-labelledby="mortgage-who-title">
      <div className="section__inner">
        <p className="eyebrow">{content.whoEyebrow}</p>
        <h2 id="mortgage-who-title">{content.whoHeading}</h2>
        <p className="mortgage-page__lead">{nbspText(content.whoLead)}</p>

        <ul
          className={
            content.whoJoiner
              ? "mortgage-who"
              : "mortgage-who mortgage-who--plain"
          }
        >
          {content.whoFits.map((item, index) => {
            const target = item.opensRule;
            const body = (
              <>
                <span>{nbspText(item.label)}</span>
                <strong>{nbspText(item.title)}</strong>
                <small>{nbspText(item.note)}</small>
                {target ? (
                  /* Знак вопроса в углу — единственное, чем нажимаемая
                     плашка отличается от соседних. Без него нажатие никак
                     не обещано: ряд выглядит одинаково. */
                  <IconInfoCircle
                    className="mortgage-who__info"
                    size={20}
                    stroke={1.75}
                    aria-hidden="true"
                  />
                ) : null}
                <Image
                  className="mortgage-program__art"
                  src={item.image}
                  alt=""
                  width={item.imageW}
                  height={item.imageH}
                  sizes={item.sizes}
                />
              </>
            );

            return (
              <Fragment key={item.title}>
                {/* Разделитель — своя ячейка сетки, а не знак внутри плашки:
                    плашка обрезает кадр по кромке, и абсолютный значок
                    срезался вместе с ним. */}
                {index > 0 && content.whoJoiner ? (
                  <li className="mortgage-who__or" aria-hidden="true">
                    {content.whoJoiner}
                  </li>
                ) : null}
                <li className="mortgage-who__cell">
                  {target ? (
                    <button
                      type="button"
                      className="mortgage-program mortgage-who__card mortgage-who__card--action"
                      onClick={() => openAndLight(target)}
                    >
                      {body}
                    </button>
                  ) : (
                    <div className="mortgage-program mortgage-who__card">
                      {body}
                    </div>
                  )}
                </li>
              </Fragment>
            );
          })}
        </ul>

        <div className="mortgage-who__rules">
          <h3 className="mortgage-rules__title">{content.rulesHeading}</h3>
          {/* Несколько правил открытыми одновременно: это не вопросы, где
              читают одно, а условия, которые сверяют между собой. */}
          <Accordion
            type="multiple"
            className="ui-accordion mortgage-rules"
            value={openRules}
            onValueChange={setOpenRules}
          >
            {content.rules.map((rule, index) => {
              const id = ruleIds[index] as string;
              return (
                <AccordionItem
                  key={rule.title}
                  value={id}
                  ref={(node) => {
                    items.current.set(id, node);
                  }}
                >
                  <AccordionTrigger>{rule.title}</AccordionTrigger>
                  <AccordionContent>
                    <RuleText
                      text={rule.text}
                      highlight={rule.highlight}
                      lit={litRule === id}
                    />
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      </div>
    </section>
  );
}

/**
 * Текст правила с выделяемой формулировкой.
 *
 * Отрезок задан в данных дословно: подсвечивать по номерам символов
 * нельзя — правка текста сдвинула бы границы и мазок лёг бы по середине
 * слова. Если отрезок не найден, правило просто выводится целиком.
 *
 * Неразрывные пробелы расставляются после деления: nbspText меняет сами
 * пробелы, и искать отрезок в уже обработанной строке пришлось бы тоже
 * обработанным.
 */
function RuleText({
  text,
  highlight,
  lit,
}: {
  text: string;
  highlight?: string;
  lit: boolean;
}) {
  const at = highlight ? text.indexOf(highlight) : -1;
  if (!highlight || at < 0) return <>{nbspText(text)}</>;

  return (
    <>
      {nbspText(text.slice(0, at))}
      <mark className={lit ? "rule-mark is-lit" : "rule-mark"}>
        {nbspText(highlight)}
      </mark>
      {nbspText(text.slice(at + highlight.length))}
    </>
  );
}
