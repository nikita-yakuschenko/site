import { unstable_rethrow } from 'next/navigation'
import { readCMSJSON } from './cms/request'
import { decodeObject } from '../server/cms-request'

// Публичный номер проекта старого сайта. Используется, пока в CMS ещё нет своего списка.
export const fallbackRoistatProjectId = 'a8d2dafd7f03641ecee21e18684113d2'

export async function activeRoistatProjectId() {
  try {
    const origin = process.env.CMS_PUBLIC_URL || (process.env.NODE_ENV === 'production' ? 'https://cms.avgst.ru' : 'http://localhost:3001')
    const data = await readCMSJSON('settings.roistat', `${origin}/api/globals/lead-delivery/counter`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(3000),
    }, decodeObject)
    if (data.configured && !data.projectId) return null
    const projectId = typeof data.projectId === 'string' ? data.projectId.trim() : ''
    return /^[a-zA-Z0-9]{8,64}$/.test(projectId) ? projectId : fallbackRoistatProjectId
  } catch (error) {
    unstable_rethrow(error)
    return fallbackRoistatProjectId
  }
}
