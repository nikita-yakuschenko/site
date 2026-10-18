// Публичный номер проекта старого сайта. Используется, пока в CMS ещё нет своего списка.
export const fallbackRoistatProjectId = 'a8d2dafd7f03641ecee21e18684113d2'

export async function activeRoistatProjectId() {
  try {
    const origin = process.env.CMS_PUBLIC_URL || (process.env.NODE_ENV === 'production' ? 'https://cms.avgst.ru' : 'http://localhost:3001')
    const response = await fetch(`${origin}/api/globals/lead-delivery/counter`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(3000),
    })
    if (!response.ok) return fallbackRoistatProjectId
    const data = await response.json() as { projectId?: string | null; configured?: boolean }
    if (data.configured && !data.projectId) return null
    const projectId = typeof data.projectId === 'string' ? data.projectId.trim() : ''
    return /^[a-zA-Z0-9]{8,64}$/.test(projectId) ? projectId : fallbackRoistatProjectId
  } catch {
    return fallbackRoistatProjectId
  }
}
