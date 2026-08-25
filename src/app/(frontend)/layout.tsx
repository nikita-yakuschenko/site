import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { copy } from '../../lib/copy'
import { OG_LOCALE } from '../../lib/locale'
import './styles.css'

const siteUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: copy.seoTitle },
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    shortcut: '/favicon.svg',
  },
  openGraph: { locale: OG_LOCALE, title: copy.seoTitle },
}

export default function FrontendLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru-RU" className={GeistSans.variable} suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}
