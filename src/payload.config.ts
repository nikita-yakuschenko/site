import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { ru } from '@payloadcms/translations/languages/ru'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Sites } from './collections/Sites'
import { Pages } from './collections/Pages'
import { Leads } from './collections/Leads'
import { ProjectContent } from './collections/ProjectContent'
import { DATETIME_FORMAT, TIMEZONE, russianTimezones } from './lib/locale'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const serverURL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'

export default buildConfig({
  serverURL,
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
    livePreview: {
      collections: ['pages'],
      breakpoints: [
        { label: 'Мобильный', name: 'mobile', width: 375, height: 812 },
        { label: 'Десктоп', name: 'desktop', width: 1440, height: 900 },
      ],
    },
  },
  collections: [Users, Media, Sites, Pages, Leads, ProjectContent],
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
