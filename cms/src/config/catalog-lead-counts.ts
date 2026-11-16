type LeadPayload = {
  projectId?: unknown
  projectExternalId?: unknown
  sourcePath?: unknown
  sourceUrl?: unknown
  meta?: { projectSlug?: unknown }
}

export type LeadProject = { id: number; code?: string | null; slug?: string | null; importKey?: string | null }

function leadPayload(value: unknown): LeadPayload | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as LeadPayload
}

function sourceSlug(payload: LeadPayload) {
  const source = payload.sourcePath || payload.sourceUrl
  if (typeof source !== 'string') return ''
  try {
    const path = new URL(source, 'https://avgst.ru').pathname
    return /^\/catalog\/([a-z0-9-]+)\/?$/.exec(path)?.[1] ?? ''
  } catch {
    return ''
  }
}

export function countProjectLeads(projects: LeadProject[], submissions: { status?: string | null; payload?: unknown }[]) {
  const counts = new Map<number, number>()
  const bySlug = new Map(projects.map(project => [project.slug, project]))
  for (const row of submissions) {
    const payload = leadPayload(row.payload)
    if (!payload) continue
    const meta = payload.meta && typeof payload.meta === 'object' ? payload.meta : {}
    const projectId = typeof payload.projectId === 'string' ? payload.projectId : ''
    const slug = typeof meta.projectSlug === 'string' ? meta.projectSlug : ''
    const externalId = typeof payload.projectExternalId === 'string' ? payload.projectExternalId : ''
    const project = bySlug.get(sourceSlug(payload)) ?? projects.find(item => {
      const external = typeof item.importKey === 'string' ? item.importKey.replace(/^catalog:/, '') : ''
      return (projectId && item.code === projectId) || (slug && item.slug === slug) || (externalId && (item.slug === externalId || external === externalId))
    })
    if (!project) continue
    counts.set(project.id, (counts.get(project.id) ?? 0) + 1)
  }
  return counts
}
