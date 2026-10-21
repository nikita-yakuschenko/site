import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { ru } from '@payloadcms/translations/languages/ru'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { Users } from './collections/Users'
import { Pages, Blocks, Forms } from './collections/Structure'
import { Projects } from './collections/Projects'
import { Stories } from './collections/Stories'
import { ProjectPrices } from './collections/ProjectPrices'
import { LeadDelivery, LeadSubmissions } from './collections/LeadSubmissions'
import { createMedia } from './collections/Media'
import { readEnvironment } from './config/environment'
import { migrations } from './migrations'
import { shouldSeedSite } from './seed/standard-site'

const root = path.dirname(fileURLToPath(import.meta.url))
const environment = readEnvironment()

export default buildConfig({
  secret: environment.secret,
  serverURL: environment.publicURL,
  routes: { admin: '/', api: '/api' },
  admin: {
    user: 'users',
    autoRefresh: true,
    dateFormat: 'dd.MM.yyyy, HH:mm',
    meta: {
      title: 'Панель управления | avgst.ru',
      titleSuffix: '',
      icons: [
        { rel: 'icon', type: 'image/svg+xml', url: '/favicon.svg' },
        { rel: 'shortcut icon', url: '/favicon.svg' },
      ],
    },
    importMap: { baseDir: root, importMapFile: path.resolve(root, 'app/(payload)/importMap.js') },
    components: {
      graphics: { Logo: './components/Brand#Brand', Icon: './components/Brand#BrandIcon' },
      providers: ['./components/admin/AdminShellRoot#AdminShellRoot', './components/admin/AdminToasts#AdminToasts'],
      Nav: './components/admin/AdminShell#EmptyNav',
      views: {
        site: { Component: './components/admin/StructureView#SiteView', path: '/site', exact: true },
        pages: { Component: './components/admin/StructureView#PagesView', path: '/pages', exact: true },
        redirects: { Component: './components/admin/RedirectsView#RedirectsView', path: '/catalog/redirects', exact: true },
        catalog: { Component: './components/admin/StructureView#CatalogView', path: '/catalog', exact: true },
        stories: { Component: './components/admin/StructureView#StoriesView', path: '/stories', exact: true },
        prices: { Component: './components/admin/StructureView#PricesView', path: '/prices', exact: true },
        registers: { Component: './components/admin/StructureView#RegistersView', path: '/registers', exact: true },
        sampling: { Component: './components/admin/StructureView#SamplingView', path: '/sampling', exact: true },
        sections: { Component: './components/admin/StructureView#SectionsView', path: '/sections', exact: true },
        integrations: { Component: './components/admin/StructureView#IntegrationsView', path: '/integrations', exact: true },
        leads: { Component: './components/admin/LeadsView#LeadsView', path: '/leads', exact: true },
        legacyBlocks: { Component: './components/admin/StructureView#BlocksView', path: '/structure/blocks', exact: true },
        legacyForms: { Component: './components/admin/StructureView#FormsView', path: '/structure/forms', exact: true },
        legacySiteView: { Component: './components/admin/LegacyRoutes#LegacySite', path: '/structure/site', exact: true },
        legacyPages: { Component: './components/admin/LegacyRoutes#LegacyPages', path: '/structure/pages', exact: true },
        legacyCatalog: { Component: './components/admin/LegacyRoutes#LegacyCatalog', path: '/structure/catalog', exact: true },
        legacyPrices: { Component: './components/admin/LegacyRoutes#LegacyPrices', path: '/structure/prices', exact: true },
        legacyRegisters: { Component: './components/admin/LegacyRoutes#LegacyRegisters', path: '/structure/registers', exact: true },
        legacySampling: { Component: './components/admin/LegacyRoutes#LegacySampling', path: '/structure/sampling', exact: true },
        legacySections: { Component: './components/admin/LegacyRoutes#LegacySections', path: '/structure/sections', exact: true },
        legacyIntegrations: { Component: './components/admin/LegacyRoutes#LegacyIntegrations', path: '/structure/integrations', exact: true },
        dashboard: { Component: './components/admin/Dashboard#Dashboard' },
        login: { Component: './components/admin/LoginView#LoginView', path: '/login', exact: true },
        createFirstUser: { Component: './components/admin/LoginView#LoginView' },
      },
    },
    timezones: { defaultTimezone: 'Europe/Moscow', supportedTimezones: [{ label: 'Москва', value: 'Europe/Moscow' }] },
  },
  i18n: {
    supportedLanguages: { ru },
    fallbackLanguage: 'ru',
    translations: { ru: { version: { saveDraft: 'Сохранить', publish: 'Опубликовать', publishChanges: 'Опубликовать' } } },
  },
  cors: [environment.publicURL],
  csrf: [environment.publicURL],
  cookiePrefix: 'avgst-cms',
  graphQL: { disable: true },
  telemetry: false,
  debug: false,
  defaultDepth: 0,
  maxDepth: 3,
  collections: [Users, Pages, Blocks, Forms, Projects, Stories, ProjectPrices, LeadSubmissions, createMedia({ directory: path.resolve(environment.mediaDir), uploadsEnabled: environment.uploadsEnabled })],
  globals: [LeadDelivery],
  editor: lexicalEditor(),
  sharp,
  upload: { limits: { fileSize: 100 * 1024 * 1024 } },
  db: postgresAdapter({
    pool: { connectionString: environment.databaseURL, connectionTimeoutMillis: 5000, max: 10 },
    push: !environment.production && process.env.PAYLOAD_DB_PUSH === 'true',
    disableCreateDatabase: true,
    migrationDir: path.resolve(root, 'migrations'),
    prodMigrations: migrations,
  }),
  typescript: { outputFile: path.resolve(root, 'payload-types.ts') },
  logger: { options: { level: 'warn', redact: ['password', 'token', 'secret', 'connectionString', 'req.headers.authorization', 'req.headers.cookie'] } },
  onInit: async (payload) => {
    if (process.env.NEXT_PHASE !== 'phase-production-build' && process.env.npm_lifecycle_event !== 'build' && !process.env.DATABASE_URL?.includes('://build:build@')) {
      try {
        const { ensureManufacturePerson } = await import('./seed/ensure-manufacture-person')
        await ensureManufacturePerson(payload)
      } catch (error) {
        payload.logger.error({ err: error }, 'Не удалось подготовить блок «Персона» на странице производства')
      }
    }
    if (!shouldSeedSite()) return
    try {
      const { ensureSiteStructure } = await import('./seed/ensure-site-structure')
      await ensureSiteStructure(payload)
    } catch (error) {
      payload.logger.error({ err: error }, 'Не удалось досоздать структуру сайта')
    }
  },
})
