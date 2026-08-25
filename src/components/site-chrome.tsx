import type { ReactNode } from 'react'
import { copy } from '../lib/copy'
import { mediaUrl } from '../lib/media'

type NavItem = { label?: string | null; href?: string | null }
type MediaLike = { url?: string | null } | number | string | null | undefined

export function SiteChrome({
  name,
  logo,
  phone,
  navigation,
  overlay,
  children,
  footer,
}: {
  name: string
  logo?: MediaLike
  phone?: string | null
  navigation?: NavItem[] | null
  overlay?: boolean
  children: ReactNode
  footer?: string | null
}) {
  const items = navigation?.filter((item) => item.label && item.href) || [
    { label: copy.breadcrumbsHome, href: '/' },
    { label: copy.catalog, href: '/projects' },
  ]
  const src = mediaUrl(logo)

  return (
    <div>
      <header className={overlay ? 'site-header site-header--overlay' : 'site-header site-header--solid'}>
        <div className="site-header__inner">
          <div className="site-header__plaque">
            <a href="/" className="site-header__brand">
              {src ? <img src={src} alt="" /> : <strong>{name}</strong>}
            </a>
            <nav className="site-header__nav" aria-label="Site">
              {items.map((item) => (
                <a key={`${item.href}-${item.label}`} href={item.href || '/'}>
                  {item.label}
                </a>
              ))}
            </nav>
            {phone ? (
              <a className="site-header__phone" href={`tel:${phone}`}>
                {phone}
              </a>
            ) : null}
          </div>
        </div>
      </header>
      {children}
      <footer className="site-footer">
        <div className="section__inner">
          <p>{footer || name}</p>
        </div>
      </footer>
    </div>
  )
}
