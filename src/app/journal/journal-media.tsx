'use client'

import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { PhotoLightbox } from '@/components/photo-lightbox'
import { VideoLightbox, kinescopeEmbed, vkEmbed } from '@/components/video-lightbox'

type Media = { kind: 'embed' | 'video' | 'audio'; src: string }
type Photo = { src: string; label: string }
type Viewer = { photos: Photo[]; index: number } | { media: Media; title: string }

function mediaFromUrl(value: string): Media | null {
  const url = new URL(value, location.origin)
  if (url.protocol !== 'https:' && url.origin !== location.origin) return null
  const host = url.hostname
  const embed = (src: string): Media => ({ kind: 'embed', src })
  if (['youtu.be', 'youtube.com', 'www.youtube.com', 'm.youtube.com', 'www.youtube-nocookie.com'].includes(host)) {
    const id = host === 'youtu.be' ? url.pathname.slice(1)
      : url.searchParams.get('v') ?? /^\/(?:shorts|embed|live)\/([\w-]{11})\/?$/.exec(url.pathname)?.[1]
    return id && /^[\w-]{11}$/.test(id) ? embed(`https://www.youtube-nocookie.com/embed/${id}?autoplay=1`) : null
  }
  if (['rutube.ru', 'www.rutube.ru'].includes(host)) {
    const id = /^\/(?:video|play\/embed)\/([a-f0-9]{32})\/?$/i.exec(url.pathname)?.[1]
    return id ? embed(`https://rutube.ru/play/embed/${id}?autoplay=1`) : null
  }
  if (['vk.com', 'www.vk.com', 'm.vk.com', 'vkvideo.ru', 'www.vkvideo.ru'].includes(host)) {
    const match = /^(?:\/)?(?:video|clip)(-?\d+)_(\d+)$/.exec(url.searchParams.get('z')?.split('/')[0] ?? url.pathname)
    const owner = match?.[1] ?? (url.pathname === '/video_ext.php' ? url.searchParams.get('oid') : '')
    const id = match?.[2] ?? url.searchParams.get('id')
    return owner && /^-?\d+$/.test(owner) && id && /^\d+$/.test(id) ? embed(vkEmbed(Number(owner), id)) : null
  }
  if (host === 'kinescope.io') {
    const id = /^\/(?:embed\/)?([a-zA-Z0-9]{10,32})\/?$/.exec(url.pathname)?.[1]
    return id ? embed(kinescopeEmbed(id)) : null
  }
  if (/\.(?:mp4|webm|ogv)$/i.test(url.pathname)) return { kind: 'video', src: url.href }
  if (/\.(?:mp3|m4a|ogg|wav|flac|aac)$/i.test(url.pathname)) return { kind: 'audio', src: url.href }
  return null
}

export function JournalMedia({ children, cover, title }: { children: ReactNode; cover: string; title: string }) {
  const article = useRef<HTMLElement>(null)
  const trigger = useRef<HTMLElement | null>(null)
  const [viewer, setViewer] = useState<Viewer | null>(null)

  useEffect(() => {
    for (const image of article.current?.querySelectorAll<HTMLImageElement>('.journal-imported-body img') ?? []) {
      if (image.closest('a')) continue
      image.tabIndex = 0
      image.setAttribute('role', 'button')
      image.setAttribute('aria-label', image.alt ? `Открыть изображение: ${image.alt}` : 'Открыть изображение')
    }
  }, [cover, title])

  const isOpen = viewer !== null
  useEffect(() => {
    if (isOpen) document.querySelector<HTMLButtonElement>('.photo-lightbox__close, .factory-video__close')?.focus({ preventScroll: true })
  }, [isOpen])

  function open(event: MouseEvent<HTMLElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    const target = event.target
    if (!(target instanceof Element)) return

    const link = target.closest('a[href]')
    if (link instanceof HTMLAnchorElement) {
      const media = mediaFromUrl(link.href)
      if (media) {
        event.preventDefault()
        trigger.current = link
        setViewer({ media, title: link.hasAttribute('data-journal-video') ? title : link.textContent?.trim() || title })
        return
      }
    }

    if (link instanceof HTMLAnchorElement) {
      const url = new URL(link.href)
      if ((url.protocol === 'https:' || url.origin === location.origin) &&
          /\.(?:avif|gif|jpe?g|png|svg|webp)$/i.test(url.pathname)) {
        event.preventDefault()
        trigger.current = link
        setViewer({ photos: [{ src: url.href, label: link.textContent?.trim() || '' }], index: 0 })
        return
      }
    }

    const coverButton = target.closest('[data-journal-cover]')
    const image = target.closest('.journal-imported-body img') ?? link?.querySelector('.journal-imported-body img')
    if (!coverButton && !(image instanceof HTMLImageElement)) return
    event.preventDefault()
    trigger.current = coverButton instanceof HTMLElement ? coverButton : link instanceof HTMLElement ? link : image as HTMLElement
    const images = Array.from(article.current?.querySelectorAll<HTMLImageElement>('.journal-imported-body img') ?? [])
    const photos = [{ src: cover, label: title }, ...images.map(item => ({ src: item.src, label: item.alt || item.closest('figure')?.querySelector('figcaption')?.textContent?.trim() || '' }))]
    setViewer({ photos, index: coverButton ? 0 : images.indexOf(image as HTMLImageElement) + 1 })
  }

  function close() {
    setViewer(null)
    requestAnimationFrame(() => trigger.current?.focus({ preventScroll: true }))
  }

  return <>
    <article ref={article} className="journal-article" onClick={open} onKeyDown={event => {
      if (event.target instanceof HTMLImageElement && event.target.getAttribute('role') === 'button' && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault()
        event.target.click()
      }
    }}>{children}</article>
    {viewer && ('photos' in viewer
      ? <div className="journal-photo-viewer"><PhotoLightbox expandable images={viewer.photos.map(photo => photo.src)} labels={viewer.photos.map(photo => photo.label)} index={viewer.index} onIndex={index => setViewer({ ...viewer, index })} onClose={close} /></div>
      : <VideoLightbox title={viewer.title} embedSrc={viewer.media.src} mediaKind={viewer.media.kind} onClose={close} />)}
  </>
}
