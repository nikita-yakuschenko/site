'use client'
import { useFormFields } from '@payloadcms/ui'
import { useEffect, useRef, type RefObject } from 'react'
import { floorName } from '../../config/project-plans'
type Draft = { label: string; floors: { label: string; image: string; rooms: { name: string; area: string }[] }[] }
export function usePlansPreview(project: boolean, frame: RefObject<HTMLIFrameElement | null>, origin: string) {
  const rows = useFormFields(([fields]) => project && (fields.plansContentSource?.value === 'database' || (fields.plans?.rows?.length ?? 0) > 0) ? (fields.plans?.rows || []).map((_, index) => ({
    label: String(fields[`plans.${index}.label`]?.value || `Вариант ${index + 1}`),
    floors: (fields[`plans.${index}.floors`]?.rows || []).map((_, floorIndex) => {
      const path = `plans.${index}.floors.${floorIndex}`
      return { label: floorName(fields[`${path}.label`]?.value as string, floorIndex), photo: fields[`${path}.photo`]?.value, image: fields[`${path}.image`]?.value,
        rooms: (fields[`${path}.rooms`]?.rows || []).map((_, roomIndex) => ({ name: String(fields[`${path}.rooms.${roomIndex}.name`]?.value || ''), area: String(fields[`${path}.rooms.${roomIndex}.area`]?.value || '') })) }
    }),
  })) : null)
  const latest = useRef<Draft[] | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    async function update() {
      if (!rows) { latest.current = null; return }
      try {
        const variants = await Promise.all(rows.map(async variant => ({ label: variant.label, floors: await Promise.all(variant.floors.map(async floor => {
          const media = floor.photo ? typeof floor.photo === 'object' ? floor.photo as { url?: string } : await fetch(`/api/media/${floor.photo}?depth=0`, { signal: controller.signal }).then(response => response.ok ? response.json() : null) : null
          return { label: floor.label, image: media?.url ? new URL(media.url, window.location.origin).href : String(floor.image || ''), rooms: floor.rooms }
        })) })))
        if (controller.signal.aborted) return
        latest.current = variants
        frame.current?.contentWindow?.postMessage({ type: 'avgst:preview-plans', variants }, origin)
      } catch { /* Keep the previous valid preview while the file is loading. */ }
    }
    void update()
    return () => controller.abort()
  }, [rows, frame, origin])
  return latest
}
