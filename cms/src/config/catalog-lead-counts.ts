type LeadPayload = {
  projectId?: unknown
  projectExternalId?: unknown
  meta?: { projectSlug?: unknown }
}

export type LeadProject = { id: number; code?: string | null; slug?: string | null; importKey?: string | null }

function leadPayload(value: unknown): LeadPayload | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as LeadPayload
}

// Заявка относится к проекту по коду CMS, адресу или внешнему идентификатору каталога.
export function countProjectLeads(projects: LeadProject[], submissions: { status?: string | null; payload?: unknown }[]) {
  const counts = new Map<number, number>()
  for (const row of submissions) {
    if (row.status === 'failed') continue
    const payload = leadPayload(row.payload)
    if (!payload) continue
    const meta = payload.meta && typeof payload.meta === 'object' ? payload.meta : {}
    const projectId = typeof payload.projectId === 'string' ? payload.projectId : ''
    const slug = typeof meta.projectSlug === 'string' ? meta.projectSlug : ''
    const externalId = typeof payload.projectExternalId === 'string' ? payload.projectExternalId : ''
    if (!projectId && !slug && !externalId) continue
    const project = projects.find(item => {
      const external = typeof item.importKey === 'string' ? item.importKey.replace(/^catalog:/, '') : ''
      return (projectId && item.code === projectId) || (slug && item.slug === slug) || (externalId && (item.slug === externalId || external === externalId))
    })
    if (!project) continue
    counts.set(project.id, (counts.get(project.id) ?? 0) + 1)
  }
  return counts
}
