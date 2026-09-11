'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { IconMenu2, IconX } from '@tabler/icons-react'
import Link from 'next/link'
import { copy } from '../lib/copy'
import { mediaUrl } from '../lib/media'
import { OfficeStatusIndicator } from './office-status'
import { RegionSwitch } from './region-switch'

type NavItem = { label?: string | null; href?: string | null }
type MediaLike = { url?: string | null } | number | string | null | undefined

export function SiteChrome({
  name,
  logo,
  phone,
  email,
  address,
  navigation,
  overlay,
  children,
  footer,
  about,
}: {
  name: string
  logo?: MediaLike
  phone?: string | null
  email?: string | null
  address?: string | null
  navigation?: NavItem[] | null
  overlay?: boolean
  children: ReactNode
  footer?: string | null
  about?: string | null
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const src = mediaUrl(logo) || '/logo_lg.svg'
  const items = (navigation?.filter((item) => item.label && item.href && item.href !== '/') || [
    { label: copy.catalogProjects, href: '/projects' },
    { label: copy.contacts, href: '/#contacts' },
  ]) as Array<{ label: string; href: string }>
  const year = new Date().getFullYear()

  useEffect(() => {
    if (!menuOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [menuOpen])

  return (
    <div className="site-shell">
      <header className={overlay ? 'site-header site-header--overlay' : 'site-header site-header--solid'}>
        <div className="site-header__inner">
          <div className="site-header__meta">
            <RegionSwitch />
            <Link className="site-meta-link" href="/mortgage">
              {copy.mortgage}
            </Link>
            <OfficeStatusIndicator />
          </div>

          <div className="site-header__plaque">
            <Link href="/" className="site-header__brand" aria-label={name}>
              <img className="site-header__logo site-header__logo--lg" src={src} alt="" />
              <img className="site-header__logo site-header__logo--sm" src="/logo.svg" alt="" />
            </Link>

            <nav className="site-header__nav" aria-label={copy.navAria}>
              {items.map((item) => (
                <Link key={`${item.href}-${item.label}`} href={item.href}>
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="site-header__aside">
              {phone ? (
                <a className="site-header__phone" href={`tel:${phone}`}>
                  {phone}
                </a>
              ) : null}
              <Link className="btn btn-yellow site-header__cta" href="/#contacts">
                {copy.askQuestion}
              </Link>
              <button
                type="button"
                className="site-header__burger"
                aria-label={copy.menu}
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
              >
                {menuOpen ? <IconX size={22} /> : <IconMenu2 size={22} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {menuOpen ? (
        <div className="site-menu">
          <button type="button" className="site-menu__backdrop" aria-label={copy.close} onClick={() => setMenuOpen(false)} />
          <div className="site-menu__panel">
            <nav>
              <Link href="/" onClick={() => setMenuOpen(false)}>
                {copy.breadcrumbsHome}
              </Link>
              {items.map((item) => (
                <Link key={`m-${item.href}`} href={item.href} onClick={() => setMenuOpen(false)}>
                  {item.label}
                </Link>
              ))}
            </nav>
            {phone ? (
              <a className="site-menu__phone" href={`tel:${phone}`} onClick={() => setMenuOpen(false)}>
                {phone}
              </a>
            ) : null}
            <Link className="btn btn-yellow" href="/#contacts" onClick={() => setMenuOpen(false)}>
              {copy.askQuestion}
            </Link>
          </div>
        </div>
      ) : null}

      {children}

      <footer className="site-footer">
        <div className="footer-grid">
          <div>
            <Link href="/" className="site-footer__brand">
              <img src={src} alt={name} />
            </Link>
            <p className="footer-about">{about || copy.footerAbout}</p>
            <Link className="footer-muted" href="/#contacts">
              {copy.privacy}
            </Link>
            <p className="footer-muted">{footer || copy.offerDisclaimer}</p>
            <p className="footer-muted">
              © {year} {name}
            </p>
          </div>
          <div>
            <h3>{copy.catalogFooter}</h3>
            <Link href="/projects">{copy.modularHouses}</Link>
            <Link href="/projects">{copy.frameHouses}</Link>
          </div>
          <div>
            <h3>{copy.menu}</h3>
            <Link href="/">{copy.breadcrumbsHome}</Link>
            <Link href="/projects">{copy.catalogProjects}</Link>
            <Link href="/#contacts">{copy.contacts}</Link>
          </div>
          <div>
            <h3>{copy.contacts}</h3>
            {address ? <p>{address}</p> : null}
            {phone ? (
              <a href={`tel:${phone}`}>{phone}</a>
            ) : null}
            {email ? (
              <a href={`mailto:${email}`}>{email}</a>
            ) : null}
          </div>
        </div>
      </footer>
    </div>
  )
}
