import Link from 'next/link'
import { IconArrowUpRight } from '@tabler/icons-react'
import { PhotoLocationBadge } from './photo-tile'

export function ExpositionVideoTile({ href, title, address }: { href: string; title: string; address: string }) {
  return <Link href={href} className="series-bento__tile exposition-place exposition-video-tile">
    <video src="/video/avangard-aerial.mp4" poster="/img/pages/exposition-hero.png"
      autoPlay muted loop playsInline preload="metadata" aria-hidden="true" tabIndex={-1} />
    <PhotoLocationBadge address={address} />
    <span className="series-bento__go" aria-hidden="true"><IconArrowUpRight size={18} stroke={2} /></span>
    <span className="series-bento__label"><span className="series-bento__name">{title}</span></span>
  </Link>
}
