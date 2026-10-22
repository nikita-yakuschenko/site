import { Suspense, type ReactNode } from 'react'
import type { Metadata, Viewport } from 'next'
import { cookies, headers } from 'next/headers'
import { GeistSans } from 'geist/font/sans'
import { ConsentShell } from '../consent/ConsentShell'
import { YandexMetrica } from '../components/yandex-metrica'
import { RoistatCounter } from '../components/roistat-counter'
import { CMSPreviewBridge } from '../components/cms-preview-bridge'
import { CMSContentProvider } from '../components/cms-content'
import { readCMSContent } from '../lib/cms/content'
import { parseConsent } from '../consent/storage'
import {
  CONSENT_COOKIE,
  CONSENT_VERSION,
  isConsentDecided,
} from '../consent/types'
import { RegionBootstrap } from '../components/region-bootstrap'
import { copy } from '../lib/copy'
import { OG_LOCALE } from '../lib/locale'
import { regionByCode, REGION_COOKIE } from '../lib/regions'
import { activeRoistatProjectId } from '../lib/roistat'
import { activeMetricaCounterId } from '../lib/yandex'
import './styles.css'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: copy.seoTitle, template: '%s | Авангард Строй' },
  description: copy.seoDescription,
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    shortcut: '/favicon.svg',
  },
  openGraph: { locale: OG_LOCALE, title: copy.seoTitle },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const jar = await cookies()
  const requestHeaders = await headers()
  const region = regionByCode(requestHeaders.get('x-avgst-region') ?? jar.get(REGION_COOKIE)?.value).code
  const raw = jar.get(CONSENT_COOKIE)?.value
  const parsed = parseConsent(raw)
  /* Версия проверяется здесь, а не на клиенте. Устаревшее согласие
     считается неданным, и баннер спросит заново. Раньше это делал эффект
     провайдера, и ему приходилось переписывать состояние уже после
     отрисовки, хотя кука прочитана прямо тут. */
  /* Номер счётчика — из CMS (интеграции → Яндекс), с запасным ENV/фолбэком. */
  const counter = await activeMetricaCounterId()
  const roistatProjectId = await activeRoistatProjectId()
  const content = await readCMSContent()

  const fresh = parsed && parsed.version === CONSENT_VERSION ? parsed : null
  const initialState = fresh && isConsentDecided(fresh) ? fresh : null

  return (
    <html lang="ru-RU" className={GeistSans.variable} suppressHydrationWarning>
      <head>
        <script async src="https://one2click.ru/t.js" data-site="o2cdb0f742c97" />
      </head>
      <body suppressHydrationWarning>
        <Suspense><CMSContentProvider records={content}><ConsentShell initialState={initialState}><RegionBootstrap region={region}>{children}</RegionBootstrap></ConsentShell></CMSContentProvider></Suspense>
        <CMSPreviewBridge />
        {roistatProjectId ? <RoistatCounter projectId={roistatProjectId} /> : null}
        {/* Номер счётчика передаётся пропсом: NEXT_PUBLIC_* подставляется в
            клиентский код на сборке, и если переменную задать только в
            окружении контейнера, в бандле окажется undefined. Здесь она
            читается на сервере в рантайме, как и должно быть.

            Suspense нужен из-за useSearchParams внутри: без него Next
            переводит весь маршрут в динамическую отрисовку. */}
        {counter ? (
          <Suspense fallback={null}>
            <YandexMetrica counter={counter} />
          </Suspense>
        ) : null}
        {/* Пиксель для тех, у кого отключён JavaScript: счётчик из скрипта
            до них не доберётся. Картинка спрятана за край экрана, как в
            сниппете из кабинета. */}
        {counter ? (
          <noscript>
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://mc.yandex.ru/watch/${counter}`}
                style={{ position: 'absolute', left: '-9999px' }}
                alt=""
              />
            </div>
          </noscript>
        ) : null}
      </body>
    </html>
  )
}
