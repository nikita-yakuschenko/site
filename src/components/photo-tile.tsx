import Image from 'next/image'
import Link from 'next/link'
import { IconArrowUpRight, IconBuildingFactory2, IconMapPin } from '@tabler/icons-react'

export function PhotoLocationBadge({ address, factory = false }: { address: string; factory?: boolean }) {
  const Icon = factory ? IconBuildingFactory2 : IconMapPin
  return <span className="independent-review__place"><Icon size={15} stroke={1.75} aria-hidden="true" /><span>{address}</span></span>
}

/** Общая фотокарточка подборок и выставочных площадок. */
export function PhotoTile({ href, image, title, className = '', count, address }: {
  href: string; image: string; title: string; className?: string; count?: string; address?: string
}) {
  return <Link href={href} className={`series-bento__tile ${className}`}>
    <Image src={image} alt="" fill sizes="(max-width: 767px) 100vw, (max-width: 959px) 50vw, 66vw" />
    {count != null && <span className="badge series-bento__count">{count}</span>}
    {address && <PhotoLocationBadge address={address} />}
    <span className="series-bento__go" aria-hidden="true"><IconArrowUpRight size={18} stroke={2} /></span>
    <span className="series-bento__label"><span className="series-bento__name">{title}</span></span>
  </Link>
}
