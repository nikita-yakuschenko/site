import {
  IconArrowUpRight,
  IconBabyCarriage,
  IconBuildingBank,
  IconDisabled,
  IconHomeHeart,
  IconPercentage,
  IconShieldCheck,
  IconUsersGroup,
  IconWallet,
} from "@tabler/icons-react";
import Image from "next/image";
import Link from "next/link";
import {
  hasConditions,
  hasFaq,
  hasWho,
  mortgageContent,
  type MortgageContent,
  type WithConditions,
  type WithWho,
} from "../lib/mortgage/content";
import { copy, nbspText } from "../lib/copy";
import { telHref } from "../lib/phone";
import { SITE } from "../lib/site";
import { ContactsPlace } from "./contacts-place";
import { CopyButton } from "./copy-button";
import { LeadForm } from "./lead-form";
import { MortgageCalculator } from "./mortgage-calculator";
import { MortgageFaq } from "./mortgage-faq";
import { MortgageOtherPrograms } from "./mortgage-other-programs";
import type { CatalogProject } from "../lib/catalog/types";
import type { MortgageProgramId } from "../lib/mortgage";

const fm = copy.familyMortgage;

const WHO_ICONS = [IconBabyCarriage, IconUsersGroup, IconDisabled] as const;
const CONDITION_ICONS = [
  IconPercentage,
  IconWallet,
  IconBuildingBank,
  IconHomeHeart,
  IconShieldCheck,
] as const;

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
      <MortgageFinance />
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

function MortgageWhoFits({ content }: { content: WithWho }) {
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
                <Icon size={28} stroke={1.5} aria-hidden="true" />
                <strong>{item.title}</strong>
                <p>{nbspText(item.text)}</p>
              </li>
            );
          })}
        </ul>

        <div className="mortgage-rules">
          {content.rules.map((rule) => (
            <article key={rule.title}>
              <h3>{rule.title}</h3>
              <p>{nbspText(rule.text)}</p>
            </article>
          ))}
        </div>
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
              <span className="mortgage-steps__num" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <strong>{step.title}</strong>
              <p>{nbspText(step.text)}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function MortgageFinance() {
  return (
    <section className="section" aria-labelledby="mortgage-finance-title">
      <div className="section__inner">
        <p className="eyebrow">{fm.financeEyebrow}</p>
        <h2 id="mortgage-finance-title">{fm.financeHeading}</h2>
        <ul className="mortgage-finance">
          {fm.finance.map((item) => (
            <li key={item.title}>
              <div className="mortgage-finance__media">
                <Image
                  src={item.image}
                  alt=""
                  fill
                  sizes="(min-width: 900px) 30vw, 100vw"
                />
              </div>
              <div className="mortgage-finance__body">
                <strong>{item.title}</strong>
                <p>{nbspText(item.text)}</p>
                <Link href={item.href}>
                  {item.cta}
                  <IconArrowUpRight size={16} stroke={2} aria-hidden="true" />
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function MortgageConditions({ content }: { content: WithConditions }) {
  return (
    <section
      className="section section--muted"
      aria-labelledby="mortgage-conditions-title"
    >
      <div className="section__inner">
        <p className="eyebrow">{content.conditionsEyebrow}</p>
        <h2 id="mortgage-conditions-title">{content.conditionsHeading}</h2>
        <ul className="mortgage-conditions">
          {content.conditions.map((item, index) => {
            const Icon = CONDITION_ICONS[index] ?? IconShieldCheck;
            return (
              <li key={item.title}>
                <Icon size={26} stroke={1.5} aria-hidden="true" />
                <strong>{item.title}</strong>
                {item.text ? <p>{nbspText(item.text)}</p> : null}
                {item.points.length ? (
                  <ul className="mortgage-conditions__points">
                    {item.points.map((point) => (
                      <li key={point}>{nbspText(point)}</li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
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
