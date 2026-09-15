import {
  IconArrowUpRight,
  IconHourglass,
  IconMedal,
  IconStar,
  IconUsers,
} from "@tabler/icons-react";
import Image from "next/image";
import { isRegisteredBlock } from "../blocks/registry";
import { copy, nbspText, projectsInSeries } from "../lib/copy";
import { mediaUrl } from "../lib/media";
import { telHref } from "../lib/phone";
import type { CatalogProject } from "../lib/catalog/types";
import { FactoryVideo } from "./factory-video";
import {
  HeroCarousel,
  type HeroMessage,
  type HeroPromo,
} from "./hero-carousel";
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
 * Сообщение и медиа-слоты приходят из раскладки, а не берутся компонентом
 * из copy напрямую: на Payload это поля блока, и редактор должен уметь их
 * менять. Блок без сообщения не выводится, пустой список слотов законен.
 */
function Hero({ block }: { block: LayoutBlock }) {
  const message = block.message as HeroMessage | undefined;
  if (!message?.heading) return null;
  const promos = Array.isArray(block.promos)
    ? (block.promos as HeroPromo[])
    : [];
  return <HeroCarousel message={message} promos={promos} />;
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
          {/* Строковая ссылка со стрелкой, а не кнопка: это переход в
              соседний раздел, а не действие. Кнопки на сайте оставлены за
              действиями, и пилюль среди них нет. */}
          <a
            className="section__link"
            href={String(block.catalogHref || "/catalog")}
          >
            {String(block.catalogLabel || copy.allProjects)}
            <IconArrowUpRight size={18} stroke={2} />
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

type SeriesTile = {
  id: string;
  title: string;
  href: string;
  image: string;
  count?: number;
};

function SeriesBento({ block }: { block: LayoutBlock }) {
  const items = Array.isArray(block.items) ? (block.items as SeriesTile[]) : [];
  if (!items.length) return null;
  return (
    <section className="section section--muted">
      <div className="section__inner">
        <div className="section__head">
          <div>
            <p className="eyebrow">
              {String(block.eyebrow || copy.seriesEyebrow)}
            </p>
            <h2>{String(block.heading || copy.seriesHeading)}</h2>
          </div>
          <a
            className="section__link"
            href={String(block.catalogHref || "/catalog")}
          >
            {String(block.catalogLabel || copy.seriesAll)}
            <IconArrowUpRight size={18} stroke={2} />
          </a>
        </div>
        <div className="series-bento">
          {items.map((item) => (
            <a
              key={item.id}
              className={`series-bento__tile series-bento__tile--${item.id}`}
              href={item.href}
            >
              <img src={item.image} alt="" />
              {item.count != null ? (
                <span className="badge series-bento__count">
                  {projectsInSeries(item.count)}
                </span>
              ) : null}
              <span className="series-bento__go" aria-hidden="true">
                <IconArrowUpRight size={18} stroke={2} />
              </span>
              <span className="series-bento__label">
                <span className="series-bento__name">{item.title}</span>
              </span>
            </a>
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

function MortgageShowcase() {
  const partners = [
    { name: "СберБанк", src: "/logos/banks/sber.svg" },
    { name: "ВТБ", src: "/logos/banks/vtb.svg" },
    { name: "ДОМ.РФ", src: "/logos/banks/domrf.svg" },
    { name: "Россельхозбанк", src: "/logos/banks/rshb.svg" },
    { name: "Примсоцбанк", src: "/logos/banks/primsoc.svg", inkSrc: "/logos/banks/primsoc-ink.svg" },
    { name: "Центр-инвест", src: "/logos/banks/centr-invest.svg" },
  ];
  const partnerLogos = () => partners.map(({ name, src, inkSrc }) => inkSrc ? (
    <span className="mortgage-partner-pair" key={name}>
      <img className="mortgage-partner mortgage-partner--primsoc" src={inkSrc} alt={name} />
      <img className="mortgage-partner mortgage-partner--primsoc-brand" src={src} alt="" aria-hidden="true" />
    </span>
  ) : <img className="mortgage-partner" key={name} src={src} alt={name} />);
  return (
    <section className="section mortgage-showcase" aria-labelledby="mortgage-showcase-title">
      <div className="section__inner mortgage-showcase__grid">
        {/* Заголовок блока живёт внутри баннера: слева рассказ и действие,
            справа кадр. Отдельной строкой над баннером он повторял бы то,
            о чём баннер и так говорит. */}
        <div className="mortgage-family">
          <div className="mortgage-family__media">
            <Image className="mortgage-family__image" src="/persons/family_1.png" alt="" fill sizes="(min-width: 961px) 60vw, 100vw" />
          </div>
          <div className="mortgage-family__body">
            <p className="eyebrow">Семейная ипотека</p>
            <h2 id="mortgage-showcase-title">{nbspText("Дом в ипотеку от ")}<em>6%</em></h2>
            <p>
              {/* Тире приклеено к предыдущему слову: иначе оно уходит в начало строки. */}
              {nbspText("Семейная ипотека\u00a0- государственная программа для семей с детьми, которая позволяет построить дом ")}
              <strong>{nbspText("по льготной ставке")}</strong>
              {nbspText(". Подберём банк, рассчитаем платёж, поможем собрать документы и получить одобрение.")}
            </p>
            <a className="btn btn-yellow" href="/mortgage">
              Рассчитать ипотеку
              <IconArrowUpRight size={18} stroke={2} />
            </a>
          </div>
        </div>
        {/* Семейной в ряду нет: ей посвящён баннер выше. */}
        <div className="mortgage-showcase__programs">
          <a className="mortgage-program mortgage-program--it" href="/mortgage">
            <span>IT-ипотека</span><strong>от 6%</strong><small>Для специалистов <span>IT-компаний</span></small>
            <Image className="mortgage-program__art" src="/persons/it.png" alt="" width={904} height={975} sizes="160px" />
            <span className="series-bento__go" aria-hidden="true">
              <IconArrowUpRight size={18} stroke={2} />
            </span>
          </a>
          <a className="mortgage-program mortgage-program--agro" href="/mortgage">
            <span>Сельская ипотека</span><strong>от 3%</strong><small>Для домов в сельской местности</small>
            <Image className="mortgage-program__art" src="/persons/agro.png" alt="" width={464} height={917} sizes="90px" />
            <span className="series-bento__go" aria-hidden="true">
              <IconArrowUpRight size={18} stroke={2} />
            </span>
          </a>
          <a className="mortgage-program mortgage-program--bank" href="/mortgage">
            <span>Базовые программы</span><strong>от 16%</strong><small>Подберём лучшие условия от ведущих банков</small>
            <Image className="mortgage-program__art" src="/persons/bank.png" alt="" width={1052} height={958} sizes="180px" />
            <span className="series-bento__go" aria-hidden="true">
              <IconArrowUpRight size={18} stroke={2} />
            </span>
          </a>
        </div>
        <div className="mortgage-showcase__partners" aria-label="Банки-партнёры">
          <div className="mortgage-showcase__partner-list">
            {/* Набор идёт дважды: на узком экране полоса едет влево ровно на
                его ширину, и копия встаёт на место первого — шва не видно.
                Вторую копию читалки пропускают. */}
            <div className="mortgage-partner-track">
              <div className="mortgage-partner-row">{partnerLogos()}</div>
              <div className="mortgage-partner-row" aria-hidden="true">{partnerLogos()}</div>
            </div>
          </div>
        </div>
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
  const steps =
    (block.steps as Array<{ title?: string; text?: string }> | undefined) || [];
  const src = mediaUrl(block.media as MediaLike) || "/fixtures/factory.jpg";
  const srcMobile = mediaUrl(block.mediaMobile as MediaLike) || undefined;
  /* Первый абзац живёт в заголовочном блоке, остальные в текстовой колонке:
     на узком экране он должен стоять между заголовком и кадром, а не после
     кадра вместе с остальным текстом. На широком порядок тот же, что и был,
     — сразу под заголовком. */
  const paragraphs = (
    Array.isArray(block.body) ? block.body : [block.body]
  ).filter(Boolean);
  const [lead, ...rest] = paragraphs;
  return (
    <section className="section section--factory">
      <div className="section__inner production">
        {/* Заголовок вынесен из текстовой колонки отдельным блоком: на узком
            экране раздел должен начинаться с него, а не с кадра, и без
            отдельного блока его оттуда не достать. На широком он встаёт над
            текстом в правой колонке, как и был. */}
        <div className="production__head">
          <p className="eyebrow">{String(block.eyebrow || copy.production)}</p>
          <h2>{nbspText(String(block.heading))}</h2>
          {lead ? <p>{nbspText(String(lead))}</p> : null}
        </div>
        <div className="production__media">
          <FactoryVideo src={src} srcMobile={srcMobile} alt={copy.factoryAlt} />
        </div>
        <div className="production__copy">
          {rest.map((paragraph, index) => (
            <p key={index}>{nbspText(String(paragraph))}</p>
          ))}
          {/* Список без порядка: участки цеха равноправны, часть из них
              работает параллельно. Нумерация выдумывала бы цепочку. */}
          {/* Две кнопки разного веса. Жёлтая — главный выход блока, второй
              выход идёт контуром. Что из них главное, решает раскладка: у
              блока просто есть первое действие и второе. */}
          {(block.ctaHref && block.ctaLabel) ||
          (block.moreHref && block.moreLabel) ? (
            <div className="production__actions">
              {block.ctaHref && block.ctaLabel ? (
                <a className="btn btn-yellow" href={String(block.ctaHref)}>
                  {String(block.ctaLabel)}
                  <IconArrowUpRight size={18} stroke={2} />
                </a>
              ) : null}
              {block.moreHref && block.moreLabel ? (
                <a
                  className="btn btn-outline-dark"
                  href={String(block.moreHref)}
                >
                  {String(block.moreLabel)}
                </a>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Подзаголовок связывает ряд с рассказом выше: без него четыре
            карточки читаются как новый блок, начавшийся сам по себе. */}
        {steps.length ? (
          <div className="production__shops-wrap">
            <h3 className="production__shops-title">
              {nbspText(String(block.stepsTitle || copy.productionStepsTitle))}
            </h3>
            <ul className="production__shops">
              {steps.map((step) => (
                <li key={step.title}>
                  <h4>{nbspText(String(step.title))}</h4>
                  {step.text ? <p>{nbspText(step.text)}</p> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
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
                <a href={telHref(phone)}>{phone}</a>
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
        if (block.blockType === "seriesBento") {
          return <SeriesBento key={index} block={block} />;
        }
        if (block.blockType === "mortgageShowcase") return <MortgageShowcase key={index} />;
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
