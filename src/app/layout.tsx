import { Suspense, type ReactNode } from 'react'
import type { Metadata, Viewport } from 'next'
import { cookies } from 'next/headers'
import { GeistSans } from 'geist/font/sans'
import { ConsentShell } from '../consent/ConsentShell'
import { YandexMetrica } from '../components/yandex-metrica'
import { parseConsent } from '../consent/storage'
import {
  CONSENT_COOKIE,
  CONSENT_VERSION,
  isConsentDecided,
} from '../consent/types'
import { copy } from '../lib/copy'
import { OG_LOCALE } from '../lib/locale'
import './styles.css'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: copy.seoTitle, template: '%s - Авангард Строй' },
  description: copy.seoDescription,
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    shortcut: '/favicon.svg',
  },
  openGraph: { locale: OG_LOCALE, title: copy.seoTitle },
  // Контур закрыт от индексации до cutover: боевой сайт пока на Tilda.
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const jar = await cookies()
  const raw = jar.get(CONSENT_COOKIE)?.value
  const parsed = parseConsent(raw)
  /* Версия проверяется здесь, а не на клиенте. Устаревшее согласие
     считается неданным, и баннер спросит заново. Раньше это делал эффект
     провайдера, и ему приходилось переписывать состояние уже после
     отрисовки, хотя кука прочитана прямо тут. */
  const fresh = parsed && parsed.version === CONSENT_VERSION ? parsed : null
  const initialState = fresh && isConsentDecided(fresh) ? fresh : null

  return (
    <html lang="ru-RU" className={GeistSans.variable} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ConsentShell initialState={initialState}>{children}</ConsentShell>
        {/* Счётчик вне ConsentShell намеренно: он грузится сразу, а не после
            согласия. Suspense нужен из-за useSearchParams внутри: без него
            Next переводит весь маршрут в динамическую отрисовку. */}
        <Suspense fallback={null}>
          <YandexMetrica />
        </Suspense>
        {/* Пиксель для тех, у кого отключён JavaScript: счётчик из скрипта
            до них не доберётся. Картинка спрятана за край экрана, как в
            сниппете из кабинета. */}
        {process.env.NEXT_PUBLIC_YM_ID ? (
          <noscript>
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://mc.yandex.ru/watch/${process.env.NEXT_PUBLIC_YM_ID}`}
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
