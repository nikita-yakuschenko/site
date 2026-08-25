import type { ReactNode } from 'react'
import { GeistSans } from 'geist/font/sans'
import './styles.css'

export default function FrontendLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" className={GeistSans.variable}>
      <body>{children}</body>
    </html>
  )
}
