'use client'

import { useFormFields } from '@payloadcms/ui'
import { useEffect, useRef, type RefObject } from 'react'
import { detectBuiltVideo } from '../../config/built-media'

export type StoryPreviewDraft = {
  slug: string
  heading: string
  place: string
  year: number
  kind: 'family' | 'business'
  catalogMark: 'discontinued' | 'individual' | null
  poster: string
  duration: string
  id: string
  subtitle: string
  card: {
    enabled: boolean
    title: string
    text: string
    image: string
  } | null
}

function mediaId(value: unknown) {
  if (!value) return null
  if (typeof value === 'object' && value && 'id' in value) return (value as { id: unknown }).id
  return value
}

async function mediaUrl(value: unknown, signal: AbortSignal) {
  const id = mediaId(value)
  if (!id) return ''
  if (typeof value === 'object' && value && 'url' in value && typeof (value as { url?: unknown }).url === 'string') {
    return new URL((value as { url: string }).url, window.location.origin).href
  }
  const doc = await fetch(`/api/media/${id}?depth=0`, { credentials: 'include', signal }).then(response => response.ok ? response.json() as Promise<{ url?: string }> : null).catch(() => null)
  return doc?.url ? new URL(doc.url, window.location.origin).href : ''
}

export function useStoryPreview(story: boolean, frame: RefObject<HTMLIFrameElement | null>, origin: string) {
  const draft = useFormFields(([fields]) => {
    if (!story) return null
    const rows = (fields.media as { rows?: unknown[] } | undefined)?.rows
    const count = Array.isArray(rows) ? rows.length : 0
    const media = Array.from({ length: count }, (_, index) => ({
      type: String(fields[`media.${index}.type`]?.value || 'photo'),
      isPrimary: fields[`media.${index}.isPrimary`]?.value === true,
      photo: fields[`media.${index}.photo`]?.value,
      videoUrl: String(fields[`media.${index}.videoUrl`]?.value || ''),
      videoFile: fields[`media.${index}.videoFile`]?.value,
      duration: String(fields[`media.${index}.duration`]?.value || ''),
      posterUrl: String(fields[`media.${index}.posterUrl`]?.value || ''),
    }))
    const binding = String(fields.binding?.value || 'catalog')
    const catalogMark = binding === 'individual' || binding === 'discontinued' ? binding as 'individual' | 'discontinued' : null
    return {
      slug: String(fields.slug?.value || ''),
      heading: String(fields.heading?.value || ''),
      subtitle: String(fields.subtitle?.value || ''),
      place: String(fields.place?.value || ''),
      year: Number(fields.year?.value) || new Date().getFullYear(),
      kind: fields.customerKind?.value === 'business' ? 'business' as const : 'family' as const,
      binding,
      project: fields.project?.value,
      cover: fields.cover?.value,
      catalogMark,
      media,
      relatedEnabled: fields['relatedCard.enabled']?.value !== false,
      relatedTitle: String(fields['relatedCard.title']?.value || ''),
      relatedText: String(fields['relatedCard.text']?.value || ''),
      relatedImage: fields['relatedCard.image']?.value,
    }
  })
  const latest = useRef<StoryPreviewDraft | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    async function update() {
      if (!draft) { latest.current = null; return }
      try {
        const videoRow = draft.media.find(row => row.type === 'video' && (detectBuiltVideo(row.videoUrl) || mediaId(row.videoFile)))
        const coverUrl = await mediaUrl(draft.cover, controller.signal)
        const poster = coverUrl || videoRow?.posterUrl || ''
        const video = videoRow ? detectBuiltVideo(videoRow.videoUrl) : null

        let card: StoryPreviewDraft['card'] = null
        if (draft.catalogMark) {
          card = {
            enabled: draft.relatedEnabled,
            title: draft.relatedTitle,
            text: draft.relatedText,
            image: await mediaUrl(draft.relatedImage, controller.signal),
          }
        } else {
          const projectId = mediaId(draft.project)
          if (projectId) {
            const project = await fetch(`/api/projects/${projectId}?depth=1`, { credentials: 'include', signal: controller.signal }).then(response => response.ok ? response.json() : null).catch(() => null)
            const desktop = project?.desktopImage
            const image = typeof desktop === 'object' && desktop?.url
              ? new URL(desktop.url, window.location.origin).href
              : typeof project?.imageUrl === 'string' ? project.imageUrl : ''
            card = {
              enabled: true,
              title: typeof project?.name === 'string' ? project.name : '',
              text: draft.subtitle,
              image,
            }
          }
        }

        if (controller.signal.aborted) return
        const payload: StoryPreviewDraft = {
          slug: draft.slug || 'draft',
          heading: draft.heading || 'Без заголовка',
          subtitle: draft.subtitle,
          place: draft.place || 'Локация',
          year: draft.year,
          kind: draft.kind,
          catalogMark: draft.catalogMark,
          poster,
          duration: videoRow?.duration || '',
          id: video?.provider === 'kinescope' ? video.id : video?.provider === 'vk' ? `vk:${video.oid}_${video.id}` : `draft:${draft.slug || 'story'}`,
          card,
        }
        latest.current = payload
        frame.current?.contentWindow?.postMessage({ type: 'avgst:preview-story', story: payload }, origin)
        frame.current?.contentWindow?.postMessage({ type: 'avgst:preview-block', key: `StoriesEntry-${payload.slug}`, dim: true }, origin)
      } catch { /* Missing files must not interrupt editing. */ }
    }
    void update()
    return () => controller.abort()
  }, [draft, frame, origin])

  return latest
}
