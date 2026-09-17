import { IconArrowUpRight } from "@tabler/icons-react";
import { Fragment } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  hasConditions,
  hasFaq,
  hasWho,
  mortgageContent,
  type MortgageContent,
  type WithConditions,
} from "../lib/mortgage/content";
import { copy, nbspText } from "../lib/copy";
import { telHref } from "../lib/phone";
import { SITE } from "../lib/site";
import { ContactsPlace } from "./contacts-place";
import { CopyButton } from "./copy-button";
import { LeadForm } from "./lead-form";
import { MortgageCalculator } from "./mortgage-calculator";
import { MortgageFaq } from "./mortgage-faq";
import { MortgageWhoFits } from "./mortgage-who-fits";
import { MortgageOtherPrograms } from "./mortgage-other-programs";
import type { CatalogProject } from "../lib/catalog/types";
import type { MortgageProgramId } from "../lib/mortgage";

const fm = copy.familyMortgage;

/** Боевая страница /mortgage — семейная ипотека. */
export function MortgagePageContent({
  projects,
  programId = "family",
}: {
  projects: CatalogProject[];
  programId?: MortgageProgramId;
}) {
  const content = mortgageContent(programId);

  /* Разделы, описывающие саму программу, показываются только там, где для
     них есть текст. У семейной он написан, у остальных трёх пока нет, и
     сочинять правила государственных программ вместо заказчика нельзя. */
  return (
    <>
      <MortgageHero content={content} />
      <MortgageCalculator projects={projects} initialProgramId={programId} />
      {hasWho(content) ? <MortgageWhoFits content={content} /> : null}
      <MortgageSteps />
      <MortgageFinance projectCount={projects.length} />
      {hasConditions(content) ? <MortgageConditions content={content} /> : null}
      <MortgageMidCta content={content} />
      {hasFaq(content) ? <MortgageFaq content={content} /> : null}
      <MortgageOtherPrograms current={programId} />
      <MortgageContacts />
    </>
  );
}

function MortgageHero({ content }: { content: MortgageContent }) {
  return (
    <section
      className="section mortgage-page mortgage-page--hero"
      aria-labelledby="mortgage-hero-title"
    >
      <div className="section__inner mortgage-showcase__grid">
        <div
          className={
            content.heroCutout
              ? "mortgage-family mortgage-family--light"
              : "mortgage-family"
          }
        >
          <div
            className={
              content.heroCutout
                ? "mortgage-family__media mortgage-family__media--cutout"
                : "mortgage-family__media"
            }
          >
            <Image
              className="mortgage-family__image"
              src={content.heroImage}
              alt=""
              fill
              priority
              sizes="(min-width: 961px) 60vw, 100vw"
            />
          </div>
          <div className="mortgage-family__body">
            {/* Надстроки нет: она повторяла первые два слова заголовка —
                «Семейная ипотека» над «Семейная ипотека на дом от 6%».
                Раздел и так назван крошками строкой выше. */}
            <h1 id="mortgage-hero-title">
              {nbspText(content.headingLine)}
              <br />
              {nbspText(content.headingBefore)}
              <em>{content.headingRate}</em>
            </h1>
            <p>{nbspText(content.lead)}</p>
            <div className="mortgage-family__actions">
              <a className="btn btn-yellow" href="#mortgage-calc">
                {copy.mortgageCalcCta}
                <IconArrowUpRight size={18} stroke={2} aria-hidden="true" />
              </a>
              <Link className="mortgage-family__more" href="/catalog">
                {copy.mortgageChooseProject}
              </Link>
            </div>
          </div>
        </div>

        <ul className="mortgage-metrics">
          {content.metrics.map((item) => (
            <li key={item.label}>
              <p>{item.label}</p>
              <strong>{item.value}</strong>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function MortgageSteps() {
  return (
    <section className="section section--muted" aria-labelledby="mortgage-steps-title">
      <div className="section__inner">
        <p className="eyebrow">{fm.stepsEyebrow}</p>
        <h2 id="mortgage-steps-title">{fm.stepsHeading}</h2>
        <ol className="mortgage-steps">
          {fm.steps.map((step, index) => (
            <li key={step.title}>
              {/* Номер шага — тот же глиф из /img/digits, которым занумерованы
                  участки производства на главной и правила программы. Мелкая
                  подпись «01» занимала строку над названием и вела счёт, но
                  ничего не держала: водяной знак считает так же, а строку
                  отдаёт названию. */}
              <span
                className="mortgage-steps__num"
                style={{
                  WebkitMaskImage: `url("/img/digits/${index + 1}.png")`,
                  maskImage: `url("/img/digits/${index + 1}.png")`,
                }}
                aria-hidden="true"
              />
              <strong>{step.title}</strong>
              <p>{nbspText(step.text)}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/**
 * Что можно оформить.
 *
 * Плашка устроена как плитка серии на главной: кадр во всю ширину, знак
 * перехода в правом верхнем углу, счётчик доступного — в левом. Под
 * курсором кадр наезжает, а знак желтеет.
 *
 * Счётчик показывается только там, где число берётся из данных: писать
 * «столько-то домов» на глаз нельзя, а пустая плашка честнее выдуманной.
 */
function MortgageFinance({ projectCount }: { projectCount: number }) {
  const counts: Partial<Record<string, string>> = {
    "/catalog": plural(projectCount, ["проект", "проекта", "проектов"]),
  };

  return (
    <section className="section" aria-labelledby="mortgage-finance-title">
      <div className="section__inner">
        <p className="eyebrow">{fm.financeEyebrow}</p>
        <h2 id="mortgage-finance-title">{fm.financeHeading}</h2>
        <ul className="mortgage-finance">
          {fm.finance.map((item) => {
            const count = counts[item.href];
            return (
              <li key={item.title}>
                <Link className="mortgage-finance__card" href={item.href}>
                  <span className="mortgage-finance__media">
                    <Image
                      src={item.image}
                      alt=""
                      fill
                      sizes="(min-width: 900px) 30vw, 100vw"
                    />
                    {count ? (
                      <span className="mortgage-finance__count">{count}</span>
                    ) : null}
                    <span className="series-bento__go" aria-hidden="true">
                      <IconArrowUpRight size={18} stroke={2} />
                    </span>
                  </span>
                  <span className="mortgage-finance__body">
                    <strong>{item.title}</strong>
                    <span className="mortgage-finance__text">
                      {nbspText(item.text)}
                    </span>
                    {/* Кнопка прижата к низу плашки: описания разной длины,
                        и без этого кнопки стояли на разной высоте. Разницу
                        забирает просвет над кнопкой, а не сама кнопка. */}
                    <span className="btn btn-yellow mortgage-finance__cta">
                      {item.cta}
                      <IconArrowUpRight size={16} stroke={2} aria-hidden="true" />
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/** Число со словом в нужном падеже: 1 проект, 2 проекта, 37 проектов. */
function plural(value: number, forms: [string, string, string]): string {
  const mod100 = value % 100;
  const mod10 = value % 10;
  const form =
    mod100 >= 11 && mod100 <= 14
      ? forms[2]
      : mod10 === 1
        ? forms[0]
        : mod10 >= 2 && mod10 <= 4
          ? forms[1]
          : forms[2];
  return `${value} ${form}`;
}

function MortgageConditions({ content }: { content: WithConditions }) {
  return (
    <section
      className="section section--muted"
      aria-labelledby="mortgage-conditions-title"
    >
      <div className="section__inner">
        <p className="eyebrow">{content.conditionsEyebrow}</p>
        {/* Астериск в заголовке и сноска под списком — одна пара: правила
            выше общие для программы, а банк поверх них ставит свои. */}
        <h2 id="mortgage-conditions-title">
          {content.conditionsHeading}
          <span className="mortgage-conditions__ref" aria-hidden="true">
            *
          </span>
        </h2>
        {/* Спецификация, а не сетка карточек. Пунктов пять, и в сетке из трёх
            колонок последний оставался сиротой в пустом ряду; здесь он просто
            последняя строка. Значения вынесены в свой столбец: цифры условий —
            самое читаемое на странице, а в заголовках карточек они тонули.
            Пункт без значения (эскроу — режим расчётов, а не число) получает
            вместо цифры знак: он единственный такой, и знак его различает. */}
        {/* Сетка живёт на самом списке, а не на отдельных строках: колонка
            значений берётся по самому длинному из них и потому общая для
            всех — иначе цифры разъезжались бы по строкам. */}
        {/* Обёртка держит сетку, а сам dl раскрыт через display: contents:
            так dt/dd и сноска стоят в одних колонках, и сноска попадает под
            текст, а не под колонку значений. */}
        <div className="mortgage-conditions">
          <dl className="mortgage-conditions__list">
          {content.conditions.map((item) => (
            <Fragment key={item.title}>
              <dt className="mortgage-conditions__value">
                {item.value ? (
                  item.value
                ) : (
                  /* Эскроу — единственный пункт без числа: вместо величины
                     предметный знак, он же и различает строку. */
                  <Image
                    className="mortgage-conditions__mark"
                    src="/persons/escrow.png"
                    alt=""
                    width={1254}
                    height={1254}
                    sizes="64px"
                    quality={90}
                  />
                )}
              </dt>
              <dd className="mortgage-conditions__body">
                <strong>{nbspText(item.title)}</strong>
                {item.text ? <p>{nbspText(item.text)}</p> : null}
                {item.points.length ? (
                  <ul className="mortgage-conditions__points">
                    {item.points.map((point) => (
                      <li key={point}>{nbspText(point)}</li>
                    ))}
                  </ul>
                ) : null}
              </dd>
            </Fragment>
          ))}
          </dl>
          <p className="mortgage-conditions__note">
            <span aria-hidden="true">*&nbsp;</span>
            {nbspText(content.conditionsNote)}
          </p>
        </div>
      </div>
    </section>
  );
}

function MortgageMidCta({ content }: { content: MortgageContent }) {
  return (
    <section className="section mortgage-mid-cta" aria-labelledby="mortgage-mid-cta-title">
      <div className="section__inner mortgage-mid-cta__inner">
        <div className="mortgage-mid-cta__media" aria-hidden="true">
          <Image
            src="/persons/family_1.png"
            alt=""
            fill
            sizes="(min-width: 900px) 40vw, 100vw"
          />
        </div>
        <div className="mortgage-mid-cta__body">
          <h2 id="mortgage-mid-cta-title">{nbspText(content.midCtaHeading)}</h2>
          <p>{nbspText(content.midCtaLead)}</p>
          <a className="btn btn-yellow" href="#mortgage-calc">
            {copy.mortgageCalcCta}
            <IconArrowUpRight size={18} stroke={2} aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}

function MortgageContacts() {
  const phone = SITE.contacts.phone;
  const email = SITE.contacts.email;
  return (
    <section className="section section--muted" id="contacts">
      <div className="section__inner contacts">
        <div className="contacts__col">
          <div className="contacts__intro">
            <p className="eyebrow">{copy.contactsEyebrow}</p>
            <h2>{fm.formHeading}</h2>
            <p className="contacts__lead">{nbspText(fm.formBody)}</p>
            <div className="contact-list">
              {phone ? (
                <div>
                  <p>{copy.phoneLabel}</p>
                  <div className="contact-list__value">
                    <a href={telHref(phone)}>{phone}</a>
                    <CopyButton value={phone} />
                  </div>
                </div>
              ) : null}
              {email ? (
                <div>
                  <p>{copy.emailLabel}</p>
                  <div className="contact-list__value">
                    <a href={`mailto:${email}`}>{email}</a>
                    <CopyButton value={email} />
                  </div>
                </div>
              ) : null}
              <div>
                <p>{copy.addressLabel}</p>
                <div className="contact-list__value">
                  <span>{nbspText(copy.officeAddressLine)}</span>
                  <CopyButton value={copy.officeAddressLine} />
                </div>
              </div>
            </div>
          </div>

          <ContactsPlace />
        </div>
        <LeadForm
          siteId={SITE.id}
          variant="card"
          heading={fm.formHeading}
          body={fm.formBody}
          submitLabel={fm.formSubmit}
        />
      </div>
    </section>
  );
}
