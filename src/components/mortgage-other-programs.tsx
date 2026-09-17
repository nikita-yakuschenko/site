import { IconArrowUpRight } from "@tabler/icons-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { copy, nbspText } from "../lib/copy";
import { mortgageHref, type MortgageProgramId } from "../lib/mortgage";

/**
 * Карточки программ.
 *
 * Одна таблица на все четыре: страница показывает те, на которых человек
 * сейчас не находится. Раньше карточек было три и они были вписаны в
 * разметку вручную — семейной среди них не было вовсе, потому что страница
 * была одна и посвящена ей.
 *
 * Картинка у каждой своя и та же, что на главной: ноутбук у IT, колосья у
 * сельской, здание банка у базовых. Семейной в этом ряду достаётся family2 —
 * кадр под квадратную карточку, а не под широкий первый экран.
 */
const PROGRAM_CARDS: readonly {
  id: MortgageProgramId;
  className: string;
  title: string;
  rate: string;
  image: string;
  imageW: number;
  imageH: number;
  sizes: string;
  note: ReactNode;
}[] = [
  {
    id: "family",
    className: "mortgage-program--family",
    title: "Семейная ипотека",
    rate: "от 6%",
    image: "/persons/family2.png",
    imageW: 1024,
    imageH: 1024,
    sizes: "170px",
    note: nbspText("Для семей с детьми"),
  },
  {
    id: "it",
    className: "mortgage-program--it",
    title: "IT-ипотека",
    rate: "от 6%",
    image: "/persons/it.png",
    imageW: 904,
    imageH: 975,
    sizes: "160px",
    note: (
      <>
        Для специалистов <span>IT-компаний</span>
      </>
    ),
  },
  {
    id: "rural",
    className: "mortgage-program--agro",
    title: "Сельская ипотека",
    rate: "от 3%",
    image: "/persons/agro.png",
    imageW: 587,
    imageH: 918,
    sizes: "110px",
    note: (
      <>
        {nbspText("Для работников АПК")}
        <br />
        {nbspText("и соц. сферы на селе")}
      </>
    ),
  },
  {
    id: "market",
    className: "mortgage-program--bank",
    title: "Базовые программы",
    rate: "от 16%",
    image: "/persons/bank.png",
    imageW: 1052,
    imageH: 958,
    sizes: "180px",
    note: (
      <>
        {nbspText("Лучшие условия")}
        <br />
        {nbspText("от ведущих банков")}
      </>
    ),
  },
];

/** Другие программы — между банками и контактами на странице программы. */
export function MortgageOtherPrograms({
  current,
}: {
  current?: MortgageProgramId;
}) {
  const cards = PROGRAM_CARDS.filter((card) => card.id !== current);

  return (
    <section
      className="section mortgage-other-programs"
      aria-labelledby="mortgage-other-programs-title"
    >
      <div className="section__inner">
        <p className="eyebrow">{copy.mortgageOtherPrograms.eyebrow}</p>
        <h2 id="mortgage-other-programs-title">
          {copy.mortgageOtherPrograms.heading}
        </h2>
        <p className="mortgage-page__lead">{copy.mortgageOtherPrograms.lead}</p>
        <div className="mortgage-showcase__programs">
          {cards.map((card) => (
            <Link
              key={card.id}
              className={`mortgage-program ${card.className}`}
              href={mortgageHref(card.id)}
            >
              <span>{card.title}</span>
              <strong>{card.rate}</strong>
              <small>{card.note}</small>
              <Image
                className="mortgage-program__art"
                src={card.image}
                alt=""
                width={card.imageW}
                height={card.imageH}
                sizes={card.sizes}
              />
              <span className="series-bento__go" aria-hidden="true">
                <IconArrowUpRight size={18} stroke={2} />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
