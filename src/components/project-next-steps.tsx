"use client";

import { IconArrowUpRight } from "@tabler/icons-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { AskDialog } from "./ask-dialog";

/** Два следующих шага после выбора комплектации: увидеть дом и обсудить
 * проект. Они не повторяют форму расчёта выше, а ведут к разным задачам. */
export function ProjectNextSteps({
  readyHome = false,
  reviewImage,
}: {
  readyHome?: boolean;
  reviewImage?: string;
}) {
  const [consultOpen, setConsultOpen] = useState(false);

  return (
    <section className="section project-next-steps" aria-label="Следующие шаги">
      <div className="section__inner project-next-steps__grid">
        <Link
          className="project-next-steps__tile project-next-steps__tile--visit"
          href="/exposition"
        >
          <span className="series-bento__go" aria-hidden="true">
            <IconArrowUpRight size={18} stroke={2} />
          </span>
          <span className="project-next-steps__copy">
            <span className="project-next-steps__title">Посмотрите дом вживую</span>
            <span className="project-next-steps__lead">
              Посетите готовый дом, ощутите тепло и уют, задайте интересующие
              вопросы.
            </span>
          </span>
          <Image
            className="project-next-steps__house"
            src="/media/project-next-steps/visit-house.png"
            alt=""
            width={1974}
            height={750}
            sizes="(min-width: 720px) 50vw, 100vw"
          />
        </Link>

        {readyHome && reviewImage ? (
          <Link
            className="project-next-steps__tile project-next-steps__tile--review"
            href="#project-exteriors-title"
          >
            <span className="series-bento__go" aria-hidden="true">
              <IconArrowUpRight size={18} stroke={2} />
            </span>
            <span className="project-next-steps__copy">
              <span className="project-next-steps__title">Обзор дома</span>
              <span className="project-next-steps__lead">
                Посмотрите дом снаружи и внутри, изучите планировку и детали
                готовой комплектации.
              </span>
            </span>
            <Image
              className="project-next-steps__review"
              src={reviewImage}
              alt=""
              fill
              sizes="(min-width: 720px) 50vw, 100vw"
            />
          </Link>
        ) : (
          <button
            type="button"
            className="project-next-steps__tile project-next-steps__tile--consult"
            onClick={() => setConsultOpen(true)}
          >
            <span className="series-bento__go" aria-hidden="true">
              <IconArrowUpRight size={18} stroke={2} />
            </span>
            <span className="project-next-steps__copy">
              <span className="project-next-steps__title">Консультация с архитектором</span>
              <span className="project-next-steps__lead">
                Эксперт разместит дом на участке, рассчитает траекторию движения
                солнца, поможет принять решение.
              </span>
            </span>
            <Image
              className="project-next-steps__architects"
              src="/media/project-next-steps/architects-consult.png"
              alt=""
              width={1280}
              height={1280}
              sizes="(min-width: 720px) 50vw, 100vw"
            />
          </button>
        )}
      </div>

      {!readyHome && consultOpen ? <AskDialog onClose={() => setConsultOpen(false)} /> : null}
    </section>
  );
}
