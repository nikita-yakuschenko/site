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
        site: { Component: './components/admin/StructureView#SiteView', path: '/structure/site', exact: true },
        pages: { Component: './components/admin/StructureView#PagesView', path: '/structure/pages', exact: true },
        catalog: { Component: './components/admin/StructureView#CatalogView', path: '/structure/catalog', exact: true },
        prices: { Component: './components/admin/StructureView#PricesView', path: '/structure/prices', exact: true },
        registers: { Component: './components/admin/StructureView#RegistersView', path: '/structure/registers', exact: true },
        sampling: { Component: './components/admin/StructureView#SamplingView', path: '/structure/sampling', exact: true },
        blocks: { Component: './components/admin/StructureView#BlocksView', path: '/structure/blocks', exact: true },
        forms: { Component: './components/admin/StructureView#FormsView', path: '/structure/forms', exact: true },
        sections: { Component: './components/admin/StructureView#SectionsView', path: '/structure/sections', exact: true },
        integrations: { Component: './components/admin/StructureView#IntegrationsView', path: '/structure/integrations', exact: true },
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
  collections: [Users, Pages, Blocks, Forms, Projects, ProjectPrices, LeadSubmissions, createMedia({ directory: path.resolve(environment.mediaDir), uploadsEnabled: environment.uploadsEnabled })],
  globals: [LeadDelivery],
  editor: lexicalEditor(),
  sharp,
  upload: { limits: { fileSize: 10 * 1024 * 1024 } },
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
    if (!shouldSeedSite()) return
    try {
      const { ensureSiteStructure } = await import('./seed/ensure-site-structure')
      await ensureSiteStructure(payload)
    } catch (error) {
      payload.logger.error({ err: error }, 'Не удалось досоздать структуру сайта')
    }
  },
})
