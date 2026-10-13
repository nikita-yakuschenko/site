import 'server-only'
import { cache } from 'react'
import { CmsCatalogProvider } from './cms-provider'
import type { ProjectHeroData } from './project-hero-data'
import { SITE } from '../site'
const catalog = new CmsCatalogProvider()
export const resolveProjectHero = cache(async (slug: string) => {
  const project = await catalog.getBySlug(slug, { siteCode: SITE.code })
  if (!project) return null
  const hero: ProjectHeroData = { projectId: project.cmsId, slug: project.slug, name: project.name, technologyBadge: project.technologyBadge, areaValue: project.areaValue, floorsValue: project.floorsValue, bedrooms: Number(project.bedrooms), bathrooms: Number(project.bathrooms), imageUrl: project.imageUrl, mobileImageUrl: project.mobileImageUrl || null }
  return { project, hero, source: 'database' as const }
})
