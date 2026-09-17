"use client";

import { copy, nbspText } from "../lib/copy";
import { BankStrip, type BankPartner } from "./bank-strip";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";

const fm = copy.familyMortgage;

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
export function MortgageFaq() {
  return (
    <section
      className="section section--muted"
      aria-labelledby="mortgage-faq-title"
    >
      <div className="section__inner">
        <p className="eyebrow">{fm.faqEyebrow}</p>
        <h2 id="mortgage-faq-title">{fm.faqHeading}</h2>
        <Accordion
          type="single"
          collapsible
          className="ui-accordion mortgage-faq"
          defaultValue="faq-0"
        >
          {fm.faq.map((item, index) => (
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
