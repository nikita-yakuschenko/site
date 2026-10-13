'use client'

import { useEffect, useId, useRef } from 'react'
import { IconX } from '@tabler/icons-react'
import { Button } from '../ui/button'

export type PreviewImage = { src: string; title: string; embed?: boolean }

export function ImagePreviewOverlay({ image, onClose }: { image: PreviewImage | null; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    if (image && !dialog.current?.open) dialog.current?.showModal()
    if (!image && dialog.current?.open) dialog.current.close()
  }, [image])

  return <dialog ref={dialog} className="image-preview-overlay shadcn-surface" aria-labelledby={titleId} onClose={onClose} onClick={event => {
    if (event.target !== event.currentTarget) return
    const bounds = event.currentTarget.getBoundingClientRect()
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) event.currentTarget.close()
  }}>
    <header className="image-preview-overlay__header">
      <h2 id={titleId}>{image?.title || 'Просмотр изображения'}</h2>
      <Button type="button" variant="ghost" size="icon" aria-label="Закрыть изображение" onClick={() => dialog.current?.close()}><IconX /></Button>
    </header>
    {image && <div className="image-preview-overlay__image">
      {image.embed
        ? <iframe src={image.src} title={image.title} allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowFullScreen />
        // eslint-disable-next-line @next/next/no-img-element
        : <img src={image.src} alt={image.title} />}
    </div>}
  </dialog>
}
