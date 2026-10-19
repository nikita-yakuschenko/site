/** Public catalogue facts used by both the published story and CMS preview. */
export type StoryProjectDetails = {
  area: number | null
  floors: number | null
  bedrooms: number | null
  bathrooms: number | null
}

export function storyProjectDetails(value: unknown): StoryProjectDetails {
  const project = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const number = (value: unknown, minimum: number, integer = false) =>
    typeof value === 'number' && Number.isFinite(value) && value >= minimum && (!integer || Number.isInteger(value)) ? value : null
  return {
    area: number(project.areaValue, Number.MIN_VALUE),
    floors: number(project.floorsValue, 1, true),
    bedrooms: number(project.bedrooms, 0, true),
    bathrooms: number(project.bathrooms, 0, true),
  }
}
