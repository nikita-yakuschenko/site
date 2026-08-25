import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { OG_LOCALE } from '../../lib/locale'
import './styles.css'

export const metadata: Metadata = {
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    shortcut: '/favicon.svg',
  },
  openGraph: { locale: OG_LOCALE },
}

export default function FrontendLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru-RU" className={GeistSans.variable}>
      <body>{children}</body>
    </html>
  )
}
