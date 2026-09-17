import { IconArrowUpRight } from "@tabler/icons-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { copy, nbspText } from "../lib/copy";
import type { MortgageProgramId } from "../lib/mortgage";

/** Другие программы — между банками и контактами на /mortgage. */
export function MortgageOtherPrograms() {
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
        <p className="mortgage-page__lead">
          {copy.mortgageOtherPrograms.lead}
        </p>
        <div className="mortgage-showcase__programs">
          <ProgramCard
            programId="it"
            className="mortgage-program--it"
            title="IT-ипотека"
            rate="от 6%"
            image="/persons/it.png"
            imageW={904}
            imageH={975}
            sizes="160px"
          >
            Для специалистов <span>IT-компаний</span>
          </ProgramCard>
          <ProgramCard
            programId="rural"
            className="mortgage-program--agro"
            title="Сельская ипотека"
            rate="от 3%"
            image="/persons/agro.png"
            imageW={464}
            imageH={917}
            sizes="90px"
          >
            {nbspText("Для работников АПК")}
            <br />
            {nbspText("и соц. сферы на селе")}
          </ProgramCard>
          <ProgramCard
            programId="market"
            className="mortgage-program--bank"
            title="Базовые программы"
            rate="от 16%"
            image="/persons/bank.png"
            imageW={1052}
            imageH={958}
            sizes="180px"
          >
            {nbspText("Лучшие условия")}
            <br />
            {nbspText("от ведущих банков")}
          </ProgramCard>
        </div>
      </div>
    </section>
  );
}

function ProgramCard({
  programId,
  className,
  title,
  rate,
  image,
  imageW,
  imageH,
  sizes,
  children,
}: {
  programId: MortgageProgramId;
  className: string;
  title: string;
  rate: string;
  image: string;
  imageW: number;
  imageH: number;
  sizes: string;
  children: ReactNode;
}) {
  return (
    <Link
      className={`mortgage-program ${className}`}
      href={`/mortgage?program=${programId}#mortgage-calc`}
    >
      <span>{title}</span>
      <strong>{rate}</strong>
      <small>{children}</small>
      <Image
        className="mortgage-program__art"
        src={image}
        alt=""
        width={imageW}
        height={imageH}
        sizes={sizes}
      />
      <span className="series-bento__go" aria-hidden="true">
        <IconArrowUpRight size={18} stroke={2} />
      </span>
    </Link>
  );
}
