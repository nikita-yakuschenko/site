"use client";

import { nbspText } from "../lib/copy";
import { BankStrip, type BankPartner } from "./bank-strip";
import type { WithFaq } from "../lib/mortgage/content";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";


const PARTNERS: BankPartner[] = [
  { name: "СберБанк", src: "/logos/banks/sber.svg" },
  { name: "ВТБ", src: "/logos/banks/vtb.svg" },
  { name: "ДОМ.РФ", src: "/logos/banks/domrf.svg" },
  { name: "Россельхозбанк", src: "/logos/banks/rshb.svg" },
  {
    name: "Примсоцбанк",
    src: "/logos/banks/primsoc.svg",
    inkSrc: "/logos/banks/primsoc-ink.svg",
  },
  { name: "Центр-инвест", src: "/logos/banks/centr-invest.svg" },
];

/** FAQ семейной ипотеки + банки в одной секции (без ложной полосы между ними). */
export function MortgageFaq({ content }: { content: WithFaq }) {
  return (
    <section
      className="section section--muted"
      aria-labelledby="mortgage-faq-title"
    >
      <div className="section__inner">
        <p className="eyebrow">{content.faqEyebrow}</p>
        <h2 id="mortgage-faq-title">{content.faqHeading}</h2>
        {/* Несколько ответов открытыми сразу: вопросы читают вразнобой и
            сверяют между собой, а не идут по одному. */}
        <Accordion
          type="multiple"
          className="ui-accordion mortgage-faq"
          defaultValue={["faq-0"]}
        >
          {content.faq.map((item, index) => (
            <AccordionItem key={item.question} value={`faq-${index}`}>
              <AccordionTrigger>{item.question}</AccordionTrigger>
              <AccordionContent>{nbspText(item.answer)}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <div className="mortgage-faq__partners">
          <BankStrip partners={PARTNERS} />
        </div>
      </div>
    </section>
  );
}
