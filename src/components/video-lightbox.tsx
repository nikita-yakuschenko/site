'use client'

import { IconX } from '@tabler/icons-react'
import { useEffect, useId } from 'react'
import { useViewerClose } from './use-viewer-close';
import { ViewerPassport } from './viewer-passport';
import { copy } from '../lib/copy'
import { trackMetricaAction } from '../lib/metrica-form-goals'

function playerSeconds(data: unknown): number | null {
  let payload = data
  if (typeof data === 'string') {
    try { payload = JSON.parse(data) } catch { return null }
  }
  if (!payload || typeof payload !== 'object') return null
  const record = payload as Record<string, unknown>
  const nested = record.value && typeof record.value === 'object' ? record.value as Record<string, unknown>
    : record.data && typeof record.data === 'object' ? record.data as Record<string, unknown> : null
  const candidates = [record.currentTime, record.time, record.seconds, nested?.currentTime, nested?.time, nested?.seconds]
  for (const value of candidates) {
    if (typeof value !== 'number' || !Number.isFinite(value)) continue
    const seconds = value > 7200 ? value / 1000 : value
    if (seconds >= 0 && seconds <= 7200) return seconds
  }
  return null
}

/** Модалка с iframe: один хром для обзоров и отзывов. */
export function VideoLightbox({
  title,
  embedSrc,
  onClose,
}: {
  title: string
  embedSrc: string
  onClose: () => void
}) {
  const { closing, close } = useViewerClose(onClose);
  const titleId = useId()

  useEffect(() => {
    trackMetricaAction('video_play')
    let watched = false
    const onMessage = (event: MessageEvent) => {
      if (watched || !/kinescope\.io|vk\.com|vkvideo\.ru/.test(event.origin)) return
      const seconds = playerSeconds(event.data)
      if (seconds === null || seconds < 30) return
      watched = true
      trackMetricaAction('video_30s')
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [close])

  return (
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={close}
    >
      <ViewerPassport active={!closing} />
      <div
        className="factory-video__modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="factory-video__overlay">
          <p id={titleId}>{title}</p>
          <button
            type="button"
            className="factory-video__close"
            aria-label={copy.close}
            onClick={close}
          >
            <IconX size={20} stroke={2.2} />
          </button>
        </div>
          <iframe
            title={title}
            src={embedSrc}
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
          />
      </div>
    </div>
  )
}

export function kinescopeEmbed(id: string): string {
  return `https://kinescope.io/embed/${id}?autoplay=1&muted=0`
}

/** Embed VK Video: oid отрицательный у сообщества, id ролика. */
export function vkEmbed(oid: number, id: string): string {
  return `https://vk.com/video_ext.php?oid=${oid}&id=${id}&hd=2&autoplay=1`
}

export type ReviewEmbed =
  | { provider: 'kinescope'; id: string }
  | { provider: 'vk'; oid: number; id: string }

export function reviewEmbedSrc(video: ReviewEmbed): string {
  if (video.provider === 'vk') return vkEmbed(video.oid, video.id)
  return kinescopeEmbed(video.id)
}
