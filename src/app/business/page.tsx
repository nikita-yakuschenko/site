import { CMSStaticBlock } from '../../components/cms-static-content'
import type { Metadata } from "next";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  IconArrowUpRight,
  IconBuildingFactory2,
  IconBuildingWarehouse,
  IconHome as IconRoof,
  IconChevronRight,
} from "@tabler/icons-react";
import heroImage from "../../../public/generated/imports/img/pages/b2b_hero.png.webp";
import machineImage from "../../../public/generated/imports/production/manufacture-hero-board.png.webp";
import { BusinessTechnologyComparison } from "../../components/business-technology-comparison";
import { BusinessProductBento } from "../../components/business-product-bento";
import { BusinessBenefitsBento } from "../../components/business-benefits-bento";
import { PageHero } from "../../components/page-hero";
import { SiteChrome } from "../../components/site-chrome";
import { LeadDialogButton } from "../../components/lead-dialog";
import { ContactsSection } from "../../components/block-renderer";
import { HOME_LAYOUT } from "../../lib/home-layout";
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
      body="Оставьте контакты. Обсудим проект и комплектацию."
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
    <CMSStaticBlock cmsBlockKey={`PagebusinessSection-${id}`} scope={"/business"}><section
      id={id}
      className={`section b2b-section${muted ? " section--muted" : ""}`}
      aria-labelledby={`${id}-title`}
    >
      <div className="section__inner">
        <h2 id={`${id}-title`}>{title}</h2>
        {children}
      </div>
    </section></CMSStaticBlock>
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
      <main>
        <div className="b2b-page">
        <PageHero data-cms-content-connected
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
          <BusinessProductBento data-cms-content-connected
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
          title="Технологии и прибыль"
        >
          <BusinessTechnologyComparison data-cms-content-connected />
        </Section>

        {SHOW_CONTRACT && (
          <Section
            id="contract"
            title="Ваши заказы - наши производственные мощности"
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
          title="Преимущества для вашего бизнеса"
          muted
        >
          <p className="b2b-partnership-lead">
            Готовые решения и поддержка, чтобы расширять ассортимент, сокращать
            сроки и выполнять больше заказов.
          </p>
          <BusinessBenefitsBento data-cms-content-connected />
        </Section>

        </div>
        <ContactsSection data-cms-content-connected
          block={{ ...HOME_LAYOUT.find((block) => block.blockType === "contactsSection")!, muted: false }}
          form={HOME_LAYOUT.find((block) => block.blockType === "leadForm")}
          contacts={SITE.contacts}
          siteId={SITE.id}
          pageId="business"
        />
      </main>
    </SiteChrome>
  );
}
