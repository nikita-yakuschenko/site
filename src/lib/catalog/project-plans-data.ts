import type { PlanVariant } from './types'
import { isHeroImage } from './project-hero-data'
export function isPlanVariants(value: unknown): value is PlanVariant[] {
  return Array.isArray(value) && value.every(variant => variant && typeof variant.label === 'string' && Array.isArray(variant.floors) && variant.floors.length > 0 && variant.floors.every((floor: { label?: unknown; image?: unknown; rooms?: unknown }) => typeof floor.label === 'string' && isHeroImage(floor.image) && Array.isArray(floor.rooms) && floor.rooms.length > 0 && floor.rooms.every(room => room && typeof room.name === 'string' && Boolean(room.name.trim()) && typeof room.area === 'string' && /^\d+(?:[.,]\d+)?(?:\s*м[²2])?$/.test(room.area.trim()) && Number.parseFloat(room.area.replace(',', '.')) > 0)))
}
