import 'dotenv/config'
import { getPayload } from 'payload'
import config from './payload.config'

export async function seed(): Promise<void> {
  const payload = await getPayload({ config })
  const ctx = { disableRevalidate: true }

  const existingCorporate = await payload.find({
    collection: 'sites',
    where: { code: { equals: 'corporate' } },
    limit: 1,
    overrideAccess: true,
  })

  const corporate =
    existingCorporate.docs[0] ||
    (await payload.create({
      collection: 'sites',
      overrideAccess: true,
      context: ctx,
      data: {
        name: 'Avangard Stroy',
        code: 'corporate',
        type: 'corporate',
        status: 'published',
        customDomains: [{ hostname: 'localhost' }, { hostname: 'avgst.ru' }],
        contacts: { phone: '+7 800 000-00-00', email: 'hello@avgst.ru' },
        navigation: [
          { label: 'Home', href: '/' },
          { label: 'Catalog', href: '/projects' },
        ],
        defaultSeo: { title: 'Avangard Stroy', description: 'Factory-built houses' },
      },
    }))

  const existingPartner = await payload.find({
    collection: 'sites',
    where: { code: { equals: 'partner-nn' } },
    limit: 1,
    overrideAccess: true,
  })
  if (!existingPartner.totalDocs) {
    await payload.create({
      collection: 'sites',
      overrideAccess: true,
      context: ctx,
      data: {
        name: 'Partner NN',
        code: 'partner-nn',
        type: 'partner',
        status: 'published',
        subdomain: 'nn',
        customDomains: [{ hostname: 'nn.example.test' }],
        partnerExternalId: 'partner-nn',
        contacts: { phone: '+7 831 000-00-00' },
        navigation: [
          { label: 'Home', href: '/' },
          { label: 'Catalog', href: '/projects' },
        ],
      },
    })
  }

  const existingHome = await payload.find({
    collection: 'pages',
    where: {
      and: [{ site: { equals: corporate.id } }, { fullPath: { equals: '/' } }],
    },
    limit: 1,
    overrideAccess: true,
    draft: true,
  })

  if (!existingHome.totalDocs) {
    await payload.create({
      collection: 'pages',
      overrideAccess: true,
      context: ctx,
      draft: false,
      data: {
        site: corporate.id,
        title: 'Home',
        slug: 'home',
        isHome: true,
        pageType: 'content',
        _status: 'published',
        layout: [
          {
            blockType: 'hero',
            heading: 'Factory-built houses in modern architecture',
            description: 'Choose a project, calculate the package, order without extra uncertainty.',
            theme: 'dark',
            size: 'large',
            primaryAction: { label: 'Catalog', href: '/projects' },
            secondaryAction: { label: 'Consultation', href: '#lead' },
          },
          {
            blockType: 'popularProjects',
            eyebrow: 'Catalog',
            heading: 'Popular projects',
            catalogHref: '/projects',
            catalogLabel: 'All projects',
          },
          {
            blockType: 'productionSection',
            eyebrow: 'Factory',
            heading: 'Avangard Stroy factory',
            body: 'House kits are manufactured in Nizhny Novgorod: cutting, painting, panel assembly and roof trusses.',
            items: [
              { label: 'CNC processing line' },
              { label: 'Panel cutting section' },
              { label: 'Painting lines' },
            ],
            ctaLabel: 'Factory tour',
            ctaHref: '#lead',
            theme: 'light',
          },
          {
            blockType: 'contactsSection',
            heading: 'Contacts',
            useSiteContacts: true,
          },
          {
            blockType: 'leadForm',
            heading: 'Request a consultation',
            body: 'We will call back and help pick a project.',
          },
        ],
      },
    })
  }

  const existingDraft = await payload.find({
    collection: 'pages',
    where: {
      and: [{ site: { equals: corporate.id } }, { slug: { equals: 'hidden-draft' } }],
    },
    limit: 1,
    overrideAccess: true,
    draft: true,
  })
  if (!existingDraft.totalDocs) {
    await payload.create({
      collection: 'pages',
      overrideAccess: true,
      context: ctx,
      draft: true,
      data: {
        site: corporate.id,
        title: 'Hidden draft',
        slug: 'hidden-draft',
        isHome: false,
        pageType: 'content',
        _status: 'draft',
        layout: [{ blockType: 'textSection', heading: 'Draft', body: 'Should not be public.' }],
      },
    })
  }

  payload.logger.info('Seed complete')
}

const isDirect = process.argv[1]?.includes('seed')
if (isDirect) {
  seed()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}
