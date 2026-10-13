'use client'

import { useFormFields } from '@payloadcms/ui'
import { useEffect, useRef, type RefObject } from 'react'

export function useGalleryPreview(gallery: 'exteriors' | 'interiors', project: boolean, frame: RefObject<HTMLIFrameElement | null>, origin: string) {
  const rows = useFormFields(([fields]) => project && fields[`${gallery}ContentSource`]?.value === 'database' ? (fields[gallery]?.rows || []).map((_, index) => ({
    photo: fields[`${gallery}.${index}.photo`]?.value,
    image: fields[`${gallery}.${index}.image`]?.value,
    isPrimary: fields[`${gallery}.${index}.isPrimary`]?.value === true,
  })) : null)
  const latest = useRef<string[] | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    async function update() {
      if (!rows) { latest.current = null; return }
      const primary = gallery === 'exteriors' ? rows.find(row => row.isPrimary) || rows[0] : null
      const ordered = primary ? [primary, ...rows.filter(row => row !== primary)] : rows
      try {
        const images = await Promise.all(ordered.map(async row => {
          if (!row.photo) return typeof row.image === 'string' ? row.image : null
          const media = typeof row.photo === 'object' ? row.photo as { url?: string } : await fetch(`/api/media/${row.photo}?depth=0`, { signal: controller.signal }).then(response => response.ok ? response.json() : null)
          return media?.url ? new URL(media.url, window.location.origin).href : null
        }))
        if (controller.signal.aborted) return
        const resolved = images.filter((image): image is string => Boolean(image))
        latest.current = resolved
        frame.current?.contentWindow?.postMessage({ type: `avgst:preview-${gallery}`, images: resolved }, origin)
      } catch { /* Missing files must not interrupt editing. */ }
    }
    void update()
    return () => controller.abort()
  }, [rows, gallery, frame, origin])
  return latest
}
