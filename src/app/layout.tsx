import type { ReactNode } from 'react'
import type { Metadata, Viewport } from 'next'
import { GeistSans } from 'geist/font/sans'
import { copy } from '../lib/copy'
import { OG_LOCALE } from '../lib/locale'
import './styles.css'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: copy.seoTitle, template: '%s — Авангард Строй' },
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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru-RU" className={GeistSans.variable} suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}
