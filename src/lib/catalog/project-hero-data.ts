import { isRecordId } from '../record-id'

export type ProjectHeroData = {
  projectId?: string
  slug: string
  name: string
  technologyBadge: string
  areaValue: number
  floorsValue: number
  bedrooms: number
  bathrooms: number
  imageUrl: string
  mobileImageUrl: string | null
}

export const isHeroImage = (value: unknown): value is string => typeof value === 'string' && (/^\/(?!\/)/.test(value) || /^https?:\/\//.test(value))

export function isProjectHeroData(value: unknown): value is ProjectHeroData {
  if (!value || typeof value !== 'object') return false
  const data = value as Record<string, unknown>
  return (data.projectId == null || isRecordId(data.projectId))
    // Unfinished drafts may have empty name, technology, metrics and image
    && typeof data.slug === 'string' && (data.slug === '' || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug))
    && typeof data.name === 'string'
    && ['', 'Панельно-каркасный', 'Модульный', 'Каркасный'].includes(String(data.technologyBadge))
    && typeof data.areaValue === 'number' && Number.isFinite(data.areaValue) && data.areaValue >= 0
    && ['floorsValue', 'bedrooms', 'bathrooms'].every(key => typeof data[key] === 'number' && Number.isInteger(data[key]) && Number(data[key]) >= 0)
    && (data.imageUrl === '' || isHeroImage(data.imageUrl)) && (data.mobileImageUrl == null || data.mobileImageUrl === '' || isHeroImage(data.mobileImageUrl))
}
