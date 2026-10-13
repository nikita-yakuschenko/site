export type ProjectHeroData = {
  projectId?: number
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
  return (data.projectId == null || (typeof data.projectId === 'number' && Number.isInteger(data.projectId) && data.projectId > 0))
    && typeof data.slug === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug)
    && typeof data.name === 'string' && Boolean(data.name.trim())
    && ['Панельно-каркасный', 'Модульный'].includes(String(data.technologyBadge))
    && typeof data.areaValue === 'number' && Number.isFinite(data.areaValue) && data.areaValue > 0
    && ['floorsValue', 'bedrooms', 'bathrooms'].every(key => typeof data[key] === 'number' && Number.isInteger(data[key]) && Number(data[key]) >= (key === 'floorsValue' ? 1 : 0))
    && isHeroImage(data.imageUrl) && (data.mobileImageUrl == null || data.mobileImageUrl === '' || isHeroImage(data.mobileImageUrl))
}
