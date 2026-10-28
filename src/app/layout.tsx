import { Suspense, type ReactNode } from 'react'
import Script from 'next/script'
import type { Metadata, Viewport } from 'next'
import { cookies, headers } from 'next/headers'
import { GeistSans } from 'geist/font/sans'
import { ConsentShell } from '../consent/ConsentShell'
import { YandexMetrica } from '../components/yandex-metrica'
import { RoistatCounter } from '../components/roistat-counter'
import { VK_PIXEL_ID } from '../lib/vk-pixel'
import { VkPixel } from '../components/vk-pixel'
import { RoistatPhoneProvider } from '../components/tracked-phone'
import { CMSPreviewBridge } from '../components/cms-preview-bridge'
import { CMSContentProvider } from '../components/cms-content'
import { CatalogAvailabilityProvider } from '../components/catalog-availability'
import { CmsCatalogProvider } from '../lib/catalog/cms-provider'
import { SITE } from '../lib/site'
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
import { isCMSUnavailable } from '../server/cms-request'
import { unstable_rethrow } from 'next/navigation'
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
  // The shell remains available during a catalog outage; catalog pages surface their own error.
  const catalogAvailability = new CmsCatalogProvider().list({ siteCode: SITE.code }).then(result => result.items).catch(error => {
    unstable_rethrow(error)
    if (!isCMSUnavailable(error)) throw error
    return []
  })
  const [counter, roistatProjectId, content, catalogItems] = await Promise.all([
    activeMetricaCounterId(), activeRoistatProjectId(), readCMSContent(), catalogAvailability,
  ])
  const readyHouses = catalogItems.some(item => Boolean(item.readyHome))

  const fresh = parsed && parsed.version === CONSENT_VERSION ? parsed : null
  const initialState = fresh && isConsentDecided(fresh) ? fresh : null

  return (
    <html lang="ru-RU" className={GeistSans.variable} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://cloud.roistat.com" />
        <Script id="one2click-counter" strategy="afterInteractive" src="https://one2click.ru/t.js" data-site="o2cdb0f742c97" />
      </head>
      <body suppressHydrationWarning>
        <Suspense fallback={null}><VkPixel /></Suspense>
        <div hidden aria-hidden="true" style={{ display: 'none' }} data-analytics-fallback="vk"><noscript><div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`https://top-fwz1.mail.ru/counter?id=${VK_PIXEL_ID};js=na`} style={{ position: 'absolute', left: '-9999px' }} alt="Top.Mail.Ru" />
        </div></noscript></div>
        {roistatProjectId ? <RoistatCounter projectId={roistatProjectId} /> : null}
        <CMSContentProvider records={content}><RoistatPhoneProvider initialData={jar.get('roistat_visit') && jar.get('roistat_call_tracking')?.value !== '0' ? jar.get('roistat_phone_script_data')?.value || '' : ''}><CatalogAvailabilityProvider readyHouses={readyHouses}><ConsentShell initialState={initialState}><RegionBootstrap region={region}>{children}</RegionBootstrap></ConsentShell></CatalogAvailabilityProvider></RoistatPhoneProvider></CMSContentProvider>
        <CMSPreviewBridge />
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
          <div hidden aria-hidden="true" style={{ display: 'none' }} data-analytics-fallback="yandex"><noscript>
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://mc.yandex.ru/watch/${counter}`}
                style={{ position: 'absolute', left: '-9999px' }}
                alt=""
              />
            </div>
          </noscript></div>
        ) : null}
      </body>
    </html>
  )
}
