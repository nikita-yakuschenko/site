import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { ru } from '@payloadcms/translations/languages/ru'
import path from 'path'
import { buildConfig, type PayloadEmailAdapter } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Sites } from './collections/Sites'
import { Pages } from './collections/Pages'
import { Leads } from './collections/Leads'
import { Catalog } from './collections/Catalog'
import { DATETIME_FORMAT, TIMEZONE, russianTimezones } from './lib/locale'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const serverURL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'

const localEmail: PayloadEmailAdapter = () => ({
  name: 'console',
  defaultFromAddress: 'noreply@avgst.ru',
  defaultFromName: 'Авангард Строй',
  sendEmail: async () => undefined,
})

export default buildConfig({
  serverURL,
  email: localEmail,
  i18n: {
    fallbackLanguage: 'ru',
    supportedLanguages: { ru },
    translations: {
      ru: {
        general: {
          email: 'Почта',
          emailAddress: 'Электронная почта',
        },
        authentication: {
          emailSent: 'Письмо отправлено',
          forgotPasswordEmailInstructions:
            'Введите адрес электронной почты. Вы получите письмо с инструкцией по восстановлению пароля.',
        },
        validation: {
          emailAddress: 'Введите корректный адрес электронной почты.',
        },
      },
    },
  },
  admin: {
    user: Users.slug,
    avatar: {
      Component: '/components/admin/AdminAccount#AdminAccount',
    },
    meta: {
      titleSuffix: '— Авангард Строй',
      icons: [{ rel: 'icon', type: 'image/svg+xml', url: '/favicon.svg' }],
    },
    dateFormat: DATETIME_FORMAT,
    timezones: {
      defaultTimezone: TIMEZONE,
      supportedTimezones: [...russianTimezones],
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
    components: {
      providers: ['/components/admin/AdminChrome#AdminChrome'],
      actions: ['/components/admin/AdminLogout#AdminLogout'],
      logout: {
        Button: '/components/admin/AdminLogout#AdminNavLogout',
      },
      beforeNavLinks: ['/components/admin/AdminGraphics#AdminNavBrand'],
      graphics: {
        Logo: '/components/admin/AdminGraphics#AdminLogo',
        Icon: '/components/admin/AdminGraphics#AdminIcon',
      },
    },
    livePreview: {
      collections: ['pages'],
      breakpoints: [
        { label: 'Мобильный', name: 'mobile', width: 375, height: 812 },
        { label: 'Десктоп', name: 'desktop', width: 1440, height: 900 },
      ],
    },
  },
  collections: [Media, Pages, Catalog, Sites, Leads, Users],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
  }),
  cors: [serverURL],
  csrf: [serverURL],
  sharp,
  plugins: [],
})
