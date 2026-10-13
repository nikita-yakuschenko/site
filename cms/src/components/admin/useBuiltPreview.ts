'use client'

import { useFormFields } from '@payloadcms/ui'
import { useEffect, useRef, type RefObject } from 'react'
import { resolveBuiltItems, type BuiltItem } from '../../config/built-media'

export function useBuiltPreview(project: boolean, frame: RefObject<HTMLIFrameElement | null>, origin: string) {
  const rows = useFormFields(([fields]) => project && fields.builtContentSource?.value === 'database' ? (fields.built?.rows || []).map((_, index) => ({
    type: fields[`built.${index}.type`]?.value as string,
    isPrimary: fields[`built.${index}.isPrimary`]?.value === true,
    photo: fields[`built.${index}.photo`]?.value,
    image: fields[`built.${index}.image`]?.value as string,
    caption: fields[`built.${index}.caption`]?.value as string,
    provider: fields[`built.${index}.provider`]?.value as string,
    videoUrl: fields[`built.${index}.videoUrl`]?.value as string,
  })) : null)
  const latest = useRef<BuiltItem[] | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    async function update() {
      if (!rows) { latest.current = null; return }
      try {
        const items = await resolveBuiltItems(rows, async value => {
          const media = typeof value === 'object' ? value as { url?: string } : await fetch(`/api/media/${value}?depth=0`, { signal: controller.signal }).then(response => response.ok ? response.json() : null)
          return media?.url ? new URL(media.url, window.location.origin).href : null
        })
        if (controller.signal.aborted) return
        latest.current = items
        frame.current?.contentWindow?.postMessage({ type: 'avgst:preview-built', items }, origin)
      } catch { /* Missing files must not interrupt editing. */ }
    }
    void update()
    return () => controller.abort()
  }, [rows, frame, origin])
  return latest
}
