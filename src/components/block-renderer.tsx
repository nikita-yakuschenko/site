import {
  IconHourglass,
  IconMedal,
  IconStar,
  IconUsers,
} from "@tabler/icons-react";
import { isRegisteredBlock } from "../blocks/registry";
import { copy } from "../lib/copy";
import { mediaUrl } from "../lib/media";
import type { CatalogProject } from "../lib/catalog/types";
import { FactoryVideo } from "./factory-video";
import { HeroCarousel, type HeroPromo, type HeroSlide } from "./hero-carousel";
import { LeadForm } from "./lead-form";
import { ProjectCard } from "./project-card";

const ADVANTAGE_ICONS = [IconHourglass, IconUsers, IconMedal, IconStar];

/**
 * Преимущество в полосе. Мобильный вариант есть не у каждого, поэтому без
 * явного типа TypeScript сужает объединение литералов и теряет поле mobile
 * у тех элементов, где его нет.
 */
type HeroAdvantage = {
  label: readonly string[];
  value: string;
  mobile?: { label: readonly string[]; value: string };
};

type MediaLike = { url?: string | null } | number | string | null | undefined;

export type LayoutBlock = { blockType: string } & Record<string, unknown>;

export type SiteContacts = {
  phone?: string | null;
  email?: string | null;
  address?: string | null;
};

/**
 * Баннер первого экрана.
 *
 * Слайды и кампания приходят из раскладки, а не берутся компонентом из
 * copy напрямую: на Payload это поля блока, и редактор должен уметь их
 * менять. Пустой список слайдов — законный случай, блок просто не выводится.
 */
function Hero({ block }: { block: LayoutBlock }) {
  const slides = Array.isArray(block.slides)
    ? (block.slides as HeroSlide[])
    : [];
  if (!slides.length) return null;
  const promo = (block.promo as HeroPromo | undefined) || null;
  return <HeroCarousel slides={slides} promo={promo} />;
}

/**
 * Полоса преимуществ компании. Раньше жила внутри баннера, хотя со сменой
 * кадра не менялась и говорит о компании, а не о слайде.
 */
function AdvantagesBar({ block }: { block: LayoutBlock }) {
  const items = Array.isArray(block.items)
    ? (block.items as HeroAdvantage[])
    : [];
  if (!items.length) return null;
  return (
    <section className="advantages">
      <ul className="advantages__list" aria-label={copy.heroAdvantagesAria}>
        {items.map((item, itemIndex) => {
          const Icon = ADVANTAGE_ICONS[itemIndex];
          return (
            <li key={item.value}>
              {Icon ? <Icon size={32} stroke={1.6} aria-hidden="true" /> : null}
              <div>
                <p>
                  {item.mobile ? (
                    <>
                      <span className="advantages__desk">
                        {item.label[0]}
                        <br />
                        {item.label[1]}
                      </span>
                      <span className="advantages__mob">
                        {item.mobile.label[0]}
                        <br />
                        {item.mobile.label[1]}
                      </span>
                    </>
                  ) : (
                    <>
                      {item.label[0]}
                      <br />
                      {item.label[1]}
                    </>
                  )}
                </p>
                <strong>
                  {item.mobile ? (
                    <>
                      <span className="advantages__desk">{item.value}</span>
                      <span className="advantages__mob">
                        {item.mobile.value}
                      </span>
                    </>
                  ) : (
                    item.value
                  )}
                </strong>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function PopularProjects({
  block,
  projects,
}: {
  block: LayoutBlock;
  projects: CatalogProject[];
}) {
  return (
    <section className="section">
      <div className="section__inner">
        <div className="section__head">
          <div>
            <p className="eyebrow">
              {String(block.eyebrow || copy.popularEyebrow)}
            </p>
            <h2>{String(block.heading || copy.popularHeading)}</h2>
          </div>
          <a
            className="btn btn-outline-dark"
            href={String(block.catalogHref || "/catalog")}
          >
            {String(block.catalogLabel || copy.allProjects)}
          </a>
        </div>
        <div className="grid-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </div>
    </section>
  );
}

function TextSection({ block }: { block: LayoutBlock }) {
  return (
    <section className="section">
      <div className="section__inner">
        {block.heading ? <h2>{String(block.heading)}</h2> : null}
        <p>{String(block.body)}</p>
      </div>
    </section>
  );
}

function Cta({ block }: { block: LayoutBlock }) {
  return (
    <section className="section">
      <div className="section__inner">
        <h2>{String(block.heading)}</h2>
        {block.body ? <p>{String(block.body)}</p> : null}
        <a className="btn btn-yellow" href={String(block.href)}>
          {String(block.label)}
        </a>
      </div>
    </section>
  );
}

function Production({ block }: { block: LayoutBlock }) {
  const items = (block.items as Array<{ label?: string }> | undefined) || [];
  const src = mediaUrl(block.media as MediaLike) || "/fixtures/factory.jpg";
  return (
    <section className="section section--factory">
      <div className="section__inner production">
        <div className="production__media">
          <FactoryVideo src={src} alt={copy.factoryAlt} />
        </div>
        <div className="production__copy">
          <p className="eyebrow">{String(block.eyebrow || copy.production)}</p>
          <h2>{String(block.heading)}</h2>
          <p>{String(block.body)}</p>
          <ul className="production__list">
            {items.map((item, index) => (
              <li key={index}>{item.label}</li>
            ))}
          </ul>
          {block.ctaHref && block.ctaLabel ? (
            <a className="btn btn-yellow" href={String(block.ctaHref)}>
              {String(block.ctaLabel)}
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function Contacts({
  block,
  contacts,
  siteId,
  pageId,
  form,
}: {
  block: LayoutBlock;
  contacts?: SiteContacts | null;
  siteId: number | string;
  pageId?: number | string;
  form?: LayoutBlock | null;
}) {
  const useSite = block.useSiteContacts !== false;
  const phone = useSite ? contacts?.phone : (block.phone as string | undefined);
  const email = useSite ? contacts?.email : (block.email as string | undefined);
  const address = useSite
    ? contacts?.address
    : (block.address as string | undefined);
  return (
    <section className="section" id="contacts">
      <div className="section__inner contacts">
        <div>
          <p className="eyebrow">{copy.contactsEyebrow}</p>
          <h2>{String(block.heading || copy.contacts)}</h2>
          <p className="contacts__lead">
            {block.body ? String(block.body) : copy.contactsBody}
          </p>
          <div className="contact-list">
            {phone ? (
              <div>
                <p>{copy.phoneLabel}</p>
                <a href={`tel:${phone}`}>{phone}</a>
              </div>
            ) : null}
            {email ? (
              <div>
                <p>{copy.emailLabel}</p>
                <a href={`mailto:${email}`}>{email}</a>
              </div>
            ) : null}
            {address ? (
              <div>
                <p>{copy.addressLabel}</p>
                <span>{address}</span>
              </div>
            ) : null}
          </div>
        </div>
        <LeadForm
          siteId={siteId}
          pageId={pageId}
          variant="card"
          heading={form?.heading ? String(form.heading) : copy.haveQuestion}
          body={form?.body ? String(form.body) : copy.haveQuestionBody}
          submitLabel={
            form?.submitLabel ? String(form.submitLabel) : copy.askQuestion
          }
          successText={form?.successText ? String(form.successText) : null}
        />
      </div>
    </section>
  );
}

function Faq({ block }: { block: LayoutBlock }) {
  const items =
    (block.items as
      Array<{ question?: string; answer?: string }> | undefined) || [];
  return (
    <section className="section">
      <div className="section__inner">
        <h2>{String(block.heading)}</h2>
        <dl className="faq">
          {items.map((item, index) => (
            <div key={index}>
              <dt>{item.question}</dt>
              <dd>{item.answer}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function UnknownBlock({ type }: { type: string }) {
  return (
    <section className="unknown-block" data-unknown-block={type}>
      {copy.unknownBlock}: {type}
    </section>
  );
}

export function BlockRenderer({
  blocks,
  projects,
  contacts,
  siteId,
  pageId,
}: {
  blocks: LayoutBlock[] | null | undefined;
  projects: CatalogProject[];
  contacts?: SiteContacts | null;
  siteId: number | string;
  pageId?: number | string;
}) {
  const list = blocks || [];
  const formBlock =
    list.find((block) => block.blockType === "leadForm") || null;
  const hasContacts = list.some(
    (block) => block.blockType === "contactsSection",
  );

  return (
    <>
      {list.map((block, index) => {
        if (!isRegisteredBlock(block.blockType)) {
          return (
            <UnknownBlock
              key={`${block.blockType}-${index}`}
              type={block.blockType}
            />
          );
        }
        if (block.blockType === "hero") {
          return <Hero key={index} block={block} />;
        }
        if (block.blockType === "advantagesBar") {
          return <AdvantagesBar key={index} block={block} />;
        }
        if (block.blockType === "popularProjects") {
          return (
            <PopularProjects key={index} block={block} projects={projects} />
          );
        }
        if (block.blockType === "textSection")
          return <TextSection key={index} block={block} />;
        if (block.blockType === "cta") return <Cta key={index} block={block} />;
        if (block.blockType === "productionSection")
          return <Production key={index} block={block} />;
        if (block.blockType === "contactsSection") {
          return (
            <Contacts
              key={index}
              block={block}
              contacts={contacts}
              siteId={siteId}
              pageId={pageId}
              form={formBlock}
            />
          );
        }
        if (block.blockType === "leadForm") {
          if (hasContacts) return null;
          return (
            <section key={index} className="section" id="lead">
              <div className="section__inner contacts">
                <LeadForm
                  siteId={siteId}
                  pageId={pageId}
                  variant="card"
                  heading={String(block.heading)}
                  body={block.body ? String(block.body) : null}
                  submitLabel={
                    block.submitLabel ? String(block.submitLabel) : null
                  }
                  successText={
                    block.successText ? String(block.successText) : null
                  }
                />
              </div>
            </section>
          );
        }
        if (block.blockType === "projectsCatalog") {
          return (
            <PopularProjects key={index} block={block} projects={projects} />
          );
        }
        if (block.blockType === "faq") return <Faq key={index} block={block} />;
        return <UnknownBlock key={index} type={block.blockType} />;
      })}
    </>
  );
}
