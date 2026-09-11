import { isRegisteredBlock } from '../blocks/registry'
import { copy } from '../lib/copy'
import { mediaUrl } from '../lib/media'
import type { CatalogProject } from '../lib/catalog/types'
import { FactoryVideo } from './factory-video'
import { HeroCarousel } from './hero-carousel'
import { LeadForm } from './lead-form'
import { ProjectCard } from './project-card'

type MediaLike = { url?: string | null } | number | string | null | undefined

export type LayoutBlock = { blockType: string } & Record<string, unknown>

export type SiteContacts = {
  phone?: string | null
  email?: string | null
  address?: string | null
}

function Hero() {
  return <HeroCarousel />
}

function PopularProjects({ block, projects }: { block: LayoutBlock; projects: CatalogProject[] }) {
  return (
    <section className="section">
      <div className="section__inner">
        <div className="section__head">
          <div>
            <p className="eyebrow">{String(block.eyebrow || copy.popularEyebrow)}</p>
            <h2>{String(block.heading || copy.popularHeading)}</h2>
          </div>
          <a className="btn btn-outline-dark" href={String(block.catalogHref || '/catalog')}>
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
  )
}

function TextSection({ block }: { block: LayoutBlock }) {
  return (
    <section className="section">
      <div className="section__inner">
        {block.heading ? <h2>{String(block.heading)}</h2> : null}
        <p>{String(block.body)}</p>
      </div>
    </section>
  )
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
  )
}

function Production({ block }: { block: LayoutBlock }) {
  const items = (block.items as Array<{ label?: string }> | undefined) || []
  const src = mediaUrl(block.media as MediaLike) || '/fixtures/factory.jpg'
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
  )
}

function Contacts({
  block,
  contacts,
  siteId,
  pageId,
  form,
}: {
  block: LayoutBlock
  contacts?: SiteContacts | null
  siteId: number | string
  pageId?: number | string
  form?: LayoutBlock | null
}) {
  const useSite = block.useSiteContacts !== false
  const phone = useSite ? contacts?.phone : (block.phone as string | undefined)
  const email = useSite ? contacts?.email : (block.email as string | undefined)
  const address = useSite ? contacts?.address : (block.address as string | undefined)
  return (
    <section className="section" id="contacts">
      <div className="section__inner contacts">
        <div>
          <p className="eyebrow">{copy.contactsEyebrow}</p>
          <h2>{String(block.heading || copy.contacts)}</h2>
          <p className="contacts__lead">{block.body ? String(block.body) : copy.contactsBody}</p>
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
          submitLabel={form?.submitLabel ? String(form.submitLabel) : copy.askQuestion}
          successText={form?.successText ? String(form.successText) : null}
        />
      </div>
    </section>
  )
}

function Faq({ block }: { block: LayoutBlock }) {
  const items = (block.items as Array<{ question?: string; answer?: string }> | undefined) || []
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
  )
}

function UnknownBlock({ type }: { type: string }) {
  return (
    <section className="unknown-block" data-unknown-block={type}>
      {copy.unknownBlock}: {type}
    </section>
  )
}

export function BlockRenderer({
  blocks,
  projects,
  contacts,
  siteId,
  pageId,
}: {
  blocks: LayoutBlock[] | null | undefined
  projects: CatalogProject[]
  contacts?: SiteContacts | null
  siteId: number | string
  pageId?: number | string
}) {
  const list = blocks || []
  const formBlock = list.find((block) => block.blockType === 'leadForm') || null
  const hasContacts = list.some((block) => block.blockType === 'contactsSection')

  return (
    <>
      {list.map((block, index) => {
        if (!isRegisteredBlock(block.blockType)) {
          return <UnknownBlock key={`${block.blockType}-${index}`} type={block.blockType} />
        }
        if (block.blockType === 'hero') {
          return <Hero key={index} />
        }
        if (block.blockType === 'popularProjects') {
          return <PopularProjects key={index} block={block} projects={projects} />
        }
        if (block.blockType === 'textSection') return <TextSection key={index} block={block} />
        if (block.blockType === 'cta') return <Cta key={index} block={block} />
        if (block.blockType === 'productionSection') return <Production key={index} block={block} />
        if (block.blockType === 'contactsSection') {
          return (
            <Contacts
              key={index}
              block={block}
              contacts={contacts}
              siteId={siteId}
              pageId={pageId}
              form={formBlock}
            />
          )
        }
        if (block.blockType === 'leadForm') {
          if (hasContacts) return null
          return (
            <section key={index} className="section" id="lead">
              <div className="section__inner contacts">
                <LeadForm
                  siteId={siteId}
                  pageId={pageId}
                  variant="card"
                  heading={String(block.heading)}
                  body={block.body ? String(block.body) : null}
                  submitLabel={block.submitLabel ? String(block.submitLabel) : null}
                  successText={block.successText ? String(block.successText) : null}
                />
              </div>
            </section>
          )
        }
        if (block.blockType === 'projectsCatalog') {
          return <PopularProjects key={index} block={block} projects={projects} />
        }
        if (block.blockType === 'faq') return <Faq key={index} block={block} />
        return <UnknownBlock key={index} type={block.blockType} />
      })}
    </>
  )
}
