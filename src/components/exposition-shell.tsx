import type { ReactNode } from 'react'
import Link from 'next/link'
import { IconChevronRight, IconPhoto } from '@tabler/icons-react'
import { SiteChrome } from './site-chrome'
import { copy, footerAboutFor } from '../lib/copy'
import { SITE } from '../lib/site'

export function ExpositionShell({ children, placeName, overlay = false }: { children: ReactNode; placeName?: string; overlay?: boolean }) {
  const placesLabel = <><span className="exposition-crumbs__full">Выставочные площадки</span><span className="exposition-crumbs__short">Площадки</span></>
  return (
    <SiteChrome name={SITE.name} phone={SITE.contacts.phone} email={SITE.contacts.email}
      address={SITE.contacts.address} navigation={[...SITE.navigation]} overlay={overlay}
      footer={SITE.footer.legal} about={footerAboutFor(SITE.name)}
      subrow={
        <nav className="project-hero__crumbs" aria-label={copy.crumbsAria}>
          <Link href="/">{copy.breadcrumbsHome}</Link>
          <IconChevronRight size={14} stroke={2} aria-hidden="true" />
          {placeName ? <>
            <Link href="/exposition">{placesLabel}</Link>
            <IconChevronRight size={14} stroke={2} aria-hidden="true" />
            <span aria-current="page">{placeName}</span>
          </> : <span aria-current="page">{placesLabel}</span>}
        </nav>
      }>
      <main className="exposition-page">{children}</main>
    </SiteChrome>
  )
}

export function ExpositionPhotoPlaceholder({ label = 'Фотографии площадки', className = '' }: { label?: string; className?: string }) {
  return (
    <div className={`exposition-photo-placeholder ${className}`} role="img" aria-label={`Место для изображения: ${label}`}>
      <IconPhoto size={36} stroke={1.5} aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}
