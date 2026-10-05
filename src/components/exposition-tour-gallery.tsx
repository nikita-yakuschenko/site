'use client'

import Image from 'next/image'
import { useState } from 'react'
import { copy } from '../lib/copy'
import type { ExpositionTourPhoto } from '../lib/exposition'
import { PhotoLightbox } from './photo-lightbox'

const GALLERY_TILES = 6

export function ExpositionTourGallery({ photos }: { photos: readonly ExpositionTourPhoto[] }) {
  const [open, setOpen] = useState<number | null>(null)
  const tiles = photos.slice(0, GALLERY_TILES)
  const rest = photos.length - tiles.length

  return <>
    <div className="project-bento exposition-tour-gallery">
      {tiles.map((photo, index) => {
        const last = rest > 0 && index === tiles.length - 1
        const classes = [index === 0 ? 'project-bento__lead' : '', last ? 'project-bento__rest' : ''].filter(Boolean).join(' ')
        return <button key={photo.src} type="button" className={classes || undefined}
          aria-label={last ? `${copy.galleryRest} ${rest}` : `${copy.galleryOpen}: ${photo.alt}`}
          onClick={() => setOpen(index)}>
          <Image src={photo.src} alt={photo.alt} width={1920} height={1280} quality={90}
            sizes={index === 0
              ? '(min-width: 1200px) 763px, (min-width: 900px) 66vw, calc(100vw - 48px)'
              : '(min-width: 1200px) 374px, (min-width: 900px) 33vw, calc((100vw - 64px) / 2)'} />
          {last && <span>+{rest}<small>{copy.galleryRest}</small></span>}
        </button>
      })}
    </div>
    {open !== null && <PhotoLightbox images={photos.map((photo) => photo.src)} labels={photos.map((photo) => photo.alt)}
      index={open} onIndex={setOpen} onClose={() => setOpen(null)} />}
  </>
}
