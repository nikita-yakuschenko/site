import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { copy } from './lib/copy'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
dotenv.config({ path: path.join(rootDir, '.env') })

function assertEnv(): void {
  const missing = ['PAYLOAD_SECRET', 'DATABASE_URL'].filter((key) => !process.env[key])
  if (!missing.length) return
  throw new Error(
    `Нет ${missing.join(', ')}. Скопируй окружение и повтори:\ncopy .env.example .env\nnpm run seed`,
  )
}

const HOME_LAYOUT = [
  {
    blockType: 'hero' as const,
    heading: copy.heroHeadline,
    description: copy.heroText,
    theme: 'dark' as const,
    size: 'large' as const,
    primaryAction: { label: copy.consult, href: '/#contacts' },
    secondaryAction: { label: copy.catalogCta, href: '/projects' },
  },
  {
    blockType: 'popularProjects' as const,
    eyebrow: copy.popularEyebrow,
    heading: copy.popularHeading,
    catalogHref: '/projects',
    catalogLabel: copy.allProjects,
  },
  {
    blockType: 'productionSection' as const,
    eyebrow: copy.production,
    heading: copy.productionHeading,
    body: copy.productionBody,
    items: copy.productionItems.map((label) => ({ label })),
    ctaLabel: copy.factoryTour,
    ctaHref: '/#contacts',
    theme: 'light' as const,
  },
  {
    blockType: 'contactsSection' as const,
    heading: copy.contacts,
    body: copy.contactsBody,
    useSiteContacts: true,
  },
  {
    blockType: 'leadForm' as const,
    heading: copy.haveQuestion,
    body: copy.haveQuestionBody,
    submitLabel: copy.askQuestion,
  },
]

const CATALOG_SEED = [
  {
    name: 'Барнхаус 113',
    slug: 'barn-113',
    technology: 'modular' as const,
    area: 116,
    floors: 1,
    bedrooms: 3,
    bathrooms: 2,
    description: 'Одноэтажный модульный барнхаус с террасой и готовой заводской комплектацией.',
  },
  {
    name: 'Барнхаус 115',
    slug: 'barn-115',
    technology: 'panel-frame' as const,
    area: 115,
    floors: 1,
    bedrooms: 3,
    bathrooms: 1,
    description: 'Панельно-каркасный барнхаус с кухней-гостиной и отдельной мастер-спальней.',
  },
  {
    name: 'Барнхаус 121',
    slug: 'barn-121',
    technology: 'modular' as const,
    area: 122,
    floors: 1,
    bedrooms: 3,
    bathrooms: 1,
    description: 'Модульный дом с панорамным остеклением и готовой заводской отделкой.',
  },
  {
    name: 'Барнхаус 134',
    slug: 'barn-134',
    technology: 'modular' as const,
    area: 134,
    floors: 1,
    bedrooms: 3,
    bathrooms: 2,
    description: 'Просторный одноэтажный барнхаус с двумя санузлами и широкой террасой.',
  },
  {
    name: 'Барнхаус 147',
    slug: 'barn-147',
    technology: 'panel-frame' as const,
    area: 147,
    floors: 2,
    bedrooms: 4,
    bathrooms: 2,
    description: 'Двухэтажный панельно-каркасный барнхаус с четырьмя спальнями.',
  },
  {
    name: 'Барнхаус 74',
    slug: 'barn-74',
    technology: 'modular' as const,
    area: 76,
    floors: 1,
    bedrooms: 2,
    bathrooms: 1,
    description: 'Компактный модульный дом для постоянного проживания и отдыха.',
  },
]

export async function seed(): Promise<void> {
  assertEnv()
  const { getPayload } = await import('payload')
  const { default: config } = await import('./payload.config')
  const payload = await getPayload({ config })
  const ctx = { disableRevalidate: true }

  for (const item of CATALOG_SEED) {
    const existing = await payload.find({
      collection: 'catalog',
      where: { slug: { equals: item.slug } },
      limit: 1,
      overrideAccess: true,
    })
    if (existing.docs[0]) {
      await payload.update({
        collection: 'catalog',
        id: existing.docs[0].id,
        overrideAccess: true,
        context: ctx,
        data: item,
      })
    } else {
      await payload.create({
        collection: 'catalog',
        overrideAccess: true,
        context: ctx,
        data: item,
      })
    }
  }

  const existingCorporate = await payload.find({
    collection: 'sites',
    where: { code: { equals: 'corporate' } },
    limit: 1,
    overrideAccess: true,
  })

  const corporateData = {
    name: 'Авангард Строй',
    code: 'corporate',
    type: 'corporate' as const,
    status: 'published' as const,
    customDomains: [{ hostname: 'localhost' }, { hostname: 'avgst.ru' }],
    contacts: {
      phone: '8 (800) 000-00-00',
      email: 'hello@avgst.ru',
      address: 'Нижний Новгород',
    },
    navigation: [
      { label: copy.catalogProjects, href: '/projects' },
      { label: copy.contacts, href: '/#contacts' },
    ],
    footer: { legal: copy.offerDisclaimer },
    defaultSeo: { title: copy.seoTitle, description: copy.seoDescription },
  }

  const corporate = existingCorporate.docs[0]
    ? await payload.update({
        collection: 'sites',
        id: existingCorporate.docs[0].id,
        overrideAccess: true,
        context: ctx,
        data: corporateData,
      })
    : await payload.create({
        collection: 'sites',
        overrideAccess: true,
        context: ctx,
        data: corporateData,
      })

  const existingPartner = await payload.find({
    collection: 'sites',
    where: { code: { equals: 'partner-nn' } },
    limit: 1,
    overrideAccess: true,
  })
  const partnerData = {
    name: 'Партнёр НН',
    code: 'partner-nn',
    type: 'partner' as const,
    status: 'published' as const,
    subdomain: 'nn',
    customDomains: [{ hostname: 'nn.example.test' }],
    partnerExternalId: 'partner-nn',
    contacts: { phone: '8 (831) 000-00-00', email: 'nn@avgst.ru', address: 'Нижний Новгород' },
    navigation: [
      { label: copy.catalogProjects, href: '/projects' },
      { label: copy.contacts, href: '/#contacts' },
    ],
  }
  if (existingPartner.docs[0]) {
    await payload.update({
      collection: 'sites',
      id: existingPartner.docs[0].id,
      overrideAccess: true,
      context: ctx,
      data: partnerData,
    })
  } else {
    await payload.create({
      collection: 'sites',
      overrideAccess: true,
      context: ctx,
      data: partnerData,
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

  const homeData = {
    site: corporate.id,
    title: copy.breadcrumbsHome,
    slug: 'home',
    isHome: true,
    pageType: 'content' as const,
    _status: 'published' as const,
    layout: HOME_LAYOUT,
  }

  if (existingHome.docs[0]) {
    await payload.update({
      collection: 'pages',
      id: existingHome.docs[0].id,
      overrideAccess: true,
      context: ctx,
      draft: false,
      data: homeData,
    })
  } else {
    await payload.create({
      collection: 'pages',
      overrideAccess: true,
      context: ctx,
      draft: false,
      data: homeData,
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
        title: 'Скрытый черновик',
        slug: 'hidden-draft',
        isHome: false,
        pageType: 'content',
        _status: 'draft',
        layout: [{ blockType: 'textSection', heading: 'Черновик', body: 'Страница не должна быть опубликована.' }],
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
