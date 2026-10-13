import { isHeroImage } from './project-hero-data'
import type { ProjectTour } from './types'

export type BuiltItem = { type: 'photo'; image: string; caption?: string } | { type: 'video'; video: ProjectTour['video']; cover?: string; caption?: string }

export function isBuiltItem(value: unknown): value is BuiltItem {
  if (!value || typeof value !== 'object') return false
  const item = value as Record<string, unknown>
  if (item.caption != null && typeof item.caption !== 'string') return false
  if (item.type === 'photo') return isHeroImage(item.image)
  if (item.type !== 'video' || (item.cover != null && !isHeroImage(item.cover)) || !item.video || typeof item.video !== 'object') return false
  const video = item.video as Record<string, unknown>
  return video.provider === 'kinescope' ? typeof video.id === 'string' && /^[a-zA-Z0-9-]+$/.test(video.id)
    : video.provider === 'vk' && typeof video.id === 'string' && /^\d+$/.test(video.id) && Number.isSafeInteger(video.oid)
}
