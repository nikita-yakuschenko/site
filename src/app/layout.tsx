import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Авангард Строй',
    template: '%s — Авангард Строй',
  },
  description: 'Строительство домов. Новая версия сайта.',
  robots: {
    // Контур ещё не наполнен: до cutover в индекс не пускаем.
    index: false,
    follow: false,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0b1220',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  )
}
