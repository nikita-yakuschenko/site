import type { Metadata } from "next";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  IconArrowUpRight,
  IconChartBar,
  IconClock,
  IconCoins,
  IconUsers,
  IconSettings,
  IconCube,
  IconPencil,
  IconTool,
  IconTag,
  IconLayersIntersect,
  IconBuildingFactory2,
  IconBuildingWarehouse,
  IconHome as IconRoof,
  IconChevronRight,
} from "@tabler/icons-react";
import heroImage from "../../../public/img/pages/b2b_hero.png";
import machineImage from "../../../public/production/manufacture-hero-board.png";
import { BusinessTechnologyComparison } from "../../components/business-technology-comparison";
import { BusinessProductBento } from "../../components/business-product-bento";
import { PageHero } from "../../components/page-hero";
import { SiteChrome } from "../../components/site-chrome";
import { LeadDialogButton } from "../../components/lead-dialog";
import { LeadForm } from "../../components/lead-form";
import { BUSINESS } from "../../lib/business-content";
import { SITE } from "../../lib/site";
import { copy, footerAboutFor, nbspText } from "../../lib/copy";
import "./business.css";
import "./product-bento.css";

// Временно скрыт по запросу; контент сохранён для последующего возврата.
const SHOW_INDUSTRIES = false;
const SHOW_CONTRACT = false;
const SHOW_PROCESS = false;

export const metadata: Metadata = {
  title: "Производственные решения для бизнеса",
  description:
    "Фермы на МЗП, кровельные панели, прекат, префаб и модульные здания. Контрактное производство и сотрудничество для строительных компаний и бизнеса.",
};

const benefitIcons: Record<number, typeof IconCube> = {
  0: IconChartBar,
  1: IconClock,
  2: IconCoins,
  3: IconUsers,
  4: IconSettings,
  5: IconCube,
};
const partnerIcons: Record<number, typeof IconCube> = {
  0: IconCube,
  1: IconPencil,
  2: IconUsers,
  3: IconTag,
  4: IconTool,
  5: IconLayersIntersect,
};
const specialProducts = {
  materials: "Материалы",
  contract: "Контрактное производство",
};

function IndustrySolution({ id }: { id: string }) {
  const product = BUSINESS.products.find((item) => item.id === id);
  if (product?.href)
    return (
      <Link href={product.href}>
        {product.title}
        <IconArrowUpRight size={14} aria-hidden="true" />
      </Link>
    );
  const title =
    product?.title ?? specialProducts[id as keyof typeof specialProducts];
  return <span className="b2b-solution-label">{title}</span>;
}

function Inquiry({
  label = "Обсудить сотрудничество",
  topic = "Сотрудничество",
  secondary = false,
}: {
  label?: string;
  topic?: string;
  secondary?: boolean;
}) {
  return (
    <LeadDialogButton
      label={label}
      heading={label}
      submitLabel="Отправить заявку"
      body="Расскажите о компании и задаче в сообщении. Обсудим проект и комплектацию."
      pageId="business"
      meta={{ direction: "b2b", topic }}
      className={secondary ? "btn b2b-secondary" : "btn btn-yellow"}
    />
  );
}

function Section({
  id,
  title,
  muted = false,
  children,
}: {
  id: string;
  title: ReactNode;
  muted?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={`section b2b-section${muted ? " section--muted" : ""}`}
      aria-labelledby={`${id}-title`}
    >
      <div className="section__inner">
        <h2 id={`${id}-title`}>{title}</h2>
        {children}
      </div>
    </section>
  );
}

export default function BusinessPage() {
  return (
    <SiteChrome
      name={SITE.name}
      phone={SITE.contacts.phone}
      email={SITE.contacts.email}
      address={SITE.contacts.address}
      navigation={[...SITE.navigation]}
      overlay={false}
      footer={SITE.footer.legal}
      about={footerAboutFor(SITE.name)}
      subrow={
        <nav className="project-hero__crumbs" aria-label={copy.crumbsAria}>
          <Link href="/">{copy.breadcrumbsHome}</Link>
          <IconChevronRight size={14} aria-hidden="true" />
          <span aria-current="page">Для бизнеса</span>
        </nav>
      }
    >
      <main className="b2b-page">
        <PageHero
          headingId="business-title"
          sectionClassName="b2b-intro"
          className="b2b-hero"
          title={
            <>
              <span className="page-hero__accent">
                {nbspText(BUSINESS.titleAccent)}
              </span>
              {nbspText(BUSINESS.title.slice(BUSINESS.titleAccent.length))}
            </>
          }
          description={nbspText(BUSINESS.lead)}
          image={heroImage}
          imageAlt="Портфель, ноутбук с проектами и строительная каска"
          actions={<Inquiry label="Начать сотрудничество" />}
        />

        <Section
          id="products"
          title="Решения для бизнеса"
          muted
        >
          <BusinessProductBento
            materialsAction={
              <Inquiry
                label="Обсудить комплектацию"
                topic="Строительные материалы"
                secondary
              />
            }
          />
        </Section>

        {SHOW_INDUSTRIES && (
          <Section id="industries" title="Решения для вашей отрасли">
            <div className="b2b-industries">
              {BUSINESS.industries.map((industry, index) => (
                <article className="b2b-industry" key={industry.title}>
                  <div
                    className={`b2b-industry__image${industry.image ? "" : " b2b-industry__image--placeholder"}`}
                  >
                    {industry.image ? (
                      <Image
                        src={industry.image}
                        alt=""
                        fill
                        sizes="(max-width: 599px) 100vw, (max-width: 959px) 50vw, 384px"
                      />
                    ) : index === 2 ? (
                      <IconBuildingWarehouse
                        size={52}
                        stroke={1.2}
                        aria-hidden="true"
                      />
                    ) : (
                      <IconRoof size={52} stroke={1.2} aria-hidden="true" />
                    )}
                  </div>
                  <div className="b2b-industry__copy">
                    <h3>{industry.title}</h3>
                    <p className="b2b-industry__audience">
                      {industry.audience}
                    </p>
                    <p>{industry.task}</p>
                    <div
                      className="b2b-product-links"
                      aria-label="Подходящие решения"
                    >
                      {industry.products.map((id) => (
                        <IndustrySolution key={id} id={id} />
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </Section>
        )}

        <Section
          id="technology-comparison"
          title="Меньше времени на объект. Больше возможностей для бизнеса."
        >
          <BusinessTechnologyComparison />
        </Section>

        {SHOW_CONTRACT && (
          <Section
            id="contract"
            title="Ваши заказы — наши производственные мощности"
          >
            <div className="b2b-contract">
              <div className="b2b-contract__image">
                <Image
                  src={machineImage}
                  alt="Промышленное оборудование для обработки деревянных деталей"
                  fill
                  sizes="(max-width: 719px) 100vw, 1152px"
                />
              </div>
              <div className="b2b-contract__copy">
                <h3>Контрактное производство</h3>
                <p>
                  Изготовление конструкций, панелей и домокомплектов на
                  действующем производстве. Используйте заводские мощности без
                  инвестиций в создание или расширение собственного завода.
                </p>
                <Inquiry
                  label="Обсудить контрактное производство"
                  topic="Контрактное производство"
                />
                <Link className="section__link" href="/manufacture">
                  Посмотреть производство
                  <IconArrowUpRight size={16} aria-hidden="true" />
                </Link>
              </div>
              <ul>
                {BUSINESS.contract.map((text) => (
                  <li key={text}>
                    <IconBuildingFactory2
                      size={26}
                      stroke={1.5}
                      aria-hidden="true"
                    />
                    {text}
                  </li>
                ))}
              </ul>
            </div>
          </Section>
        )}

        {SHOW_PROCESS && (
          <Section
            id="process"
            title="От первого проекта до регулярных поставок"
          >
            <ol className="b2b-process">
              {BUSINESS.process.map(([title, description], index) => (
                <li key={title}>
                  <span className="b2b-process__number" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </li>
              ))}
            </ol>
          </Section>
        )}

        <Section
          id="partnership"
          title="Развивайте строительный бизнес вместе с нами"
          muted
        >
          <p className="b2b-partnership-lead">
            Больше возможностей для бизнеса и меньше производственных ограничений.
            Используйте наши мощности, готовые решения и поддержку, чтобы расширять
            ассортимент, сокращать сроки и выполнять больше заказов.
          </p>
          <div className="b2b-feature-grid">
            {[...BUSINESS.benefits, ...BUSINESS.partnership.filter(([title]) => !BUSINESS.benefits.some(([benefitTitle]) => benefitTitle === title))].map(([title, description], index) => {
              const Icon = index < BUSINESS.benefits.length ? benefitIcons[index] ?? IconCube : partnerIcons[index - BUSINESS.benefits.length + 1] ?? IconCube;
              return (
                <article className="b2b-feature" key={title}>
                  <Icon size={30} stroke={1.5} aria-hidden="true" />
                  <div>
                    <h3>{title}</h3>
                    <p>{description}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </Section>

        <Section
          id="inquiry"
          title="Найдём производственное решение для вашей задачи"
          muted
        >
          <div className="b2b-contact">
            <div className="b2b-contact__copy">
              <p>
                Расскажите, что строите и какие задачи хотите передать
                производству. Подберём продукт, обсудим комплектацию и
                подготовку расчёта.
              </p>
              <div className="b2b-actions">
                <Inquiry />
                <a
                  className="btn b2b-secondary"
                  href={`mailto:${SITE.contacts.email}?subject=${encodeURIComponent("B2B: проект на расчёт")}`}
                >
                  Отправить проект на расчёт
                  <IconArrowUpRight size={18} aria-hidden="true" />
                </a>
              </div>
              <p className="b2b-contact__direct">
                Чертежи и файлы проекта можно отправить на{" "}
                <a
                  href={`mailto:${SITE.contacts.email}?subject=${encodeURIComponent("B2B: проект на расчёт")}`}
                >
                  {SITE.contacts.email}
                </a>
                .<br />
                Обсудить задачу по телефону:{" "}
                <a href="tel:+78312666645">{SITE.contacts.phone}</a>.
              </p>
              <Image
                src="/img/pages/B2B.png"
                alt="Вариант размещения модульных зданий"
                width={640}
                height={360}
                sizes="(max-width: 719px) 100vw, 576px"
              />
            </div>
            <LeadForm
              siteId={SITE.id}
              pageId="business"
              heading="Обсудим вашу задачу"
              body="Укажите компанию, тип объекта и необходимые конструкции в сообщении."
              submitLabel="Отправить заявку"
              variant="card"
              meta={{ direction: "b2b", topic: "Сотрудничество" }}
            />
          </div>
        </Section>
      </main>
    </SiteChrome>
  );
}
