'use client'

import { useFormFields } from '@payloadcms/ui'
import { useEffect, useRef, type RefObject } from 'react'
import { detectBuiltVideo } from '../../config/built-media'

export type StoryPreviewDraft = {
  slug: string
  heading: string
  title: string
  detail: string
  family: string
  place: string
  year: number
  kind: 'family' | 'business'
  catalogMark: 'discontinued' | 'individual' | null
  poster: string
  duration: string
  id: string
}

function mediaId(value: unknown) {
  if (!value) return null
  if (typeof value === 'object' && value && 'id' in value) return (value as { id: unknown }).id
  return value
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
      image: String(fields[`media.${index}.image`]?.value || ''),
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
    }
  })
  const latest = useRef<StoryPreviewDraft | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    async function update() {
      if (!draft) { latest.current = null; return }
      try {
        // Только реально привязанное видео: пустая строка с posterUrl не должна тащить кадр.
        const videoRow = draft.media.find(row => row.type === 'video' && (detectBuiltVideo(row.videoUrl) || mediaId(row.videoFile)))
        const primary = draft.media.find(row => row.isPrimary && mediaId(row.photo)) || draft.media.find(row => mediaId(row.photo))
        const coverId = mediaId(draft.cover)
        const photoValue = coverId || primary?.photo || null
        const media = photoValue
          ? typeof photoValue === 'object'
            ? photoValue as { url?: string }
            : await fetch(`/api/media/${mediaId(photoValue)}?depth=0`, { credentials: 'include', signal: controller.signal }).then(response => response.ok ? response.json() : null)
          : null
        const poster = media?.url
          ? new URL(media.url, window.location.origin).href
          : (videoRow?.posterUrl || '')
        const video = videoRow ? detectBuiltVideo(videoRow.videoUrl) : null
        let title = draft.heading
        const projectId = mediaId(draft.project)
        if (draft.binding === 'catalog' && projectId) {
          const project = await fetch(`/api/projects/${projectId}?depth=0`, { credentials: 'include', signal: controller.signal }).then(response => response.ok ? response.json() : null).catch(() => null)
          if (project?.name) title = String(project.name)
        }
        if (controller.signal.aborted) return
        const payload: StoryPreviewDraft = {
          slug: draft.slug || 'draft',
          heading: draft.heading || 'Без заголовка',
          title,
          detail: draft.subtitle,
          family: draft.subtitle,
          place: draft.place || 'Локация',
          year: draft.year,
          kind: draft.kind,
          catalogMark: draft.catalogMark,
          poster,
          duration: videoRow?.duration || '',
          id: video?.provider === 'kinescope' ? video.id : video?.provider === 'vk' ? `vk:${video.oid}_${video.id}` : `draft:${draft.slug || 'story'}`,
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
