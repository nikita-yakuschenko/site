import { unstable_rethrow } from 'next/navigation'
import { readCMSJSON } from './cms/request'
import { decodeObject } from '../server/cms-request'
import { fallbackMessengerLinks, type MessengerLinks } from './messengers'

function cmsOrigin() {
  return process.env.CMS_PUBLIC_URL || (process.env.NODE_ENV === 'production' ? 'https://cms.avgst.ru' : 'http://localhost:3001')
}

function hrefOf(entry: unknown, fallback: string) {
  if (!entry || typeof entry !== 'object') return fallback
  const record = entry as { enabled?: unknown; href?: unknown }
  if (record.enabled === false) return ''
  return typeof record.href === 'string' && record.href ? record.href : fallback
}

export async function activeMessengerLinks(): Promise<MessengerLinks> {
  const fallback = fallbackMessengerLinks()
  try {
    const data = await readCMSJSON('settings.messengers', `${cmsOrigin()}/api/globals/lead-delivery/messengers`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(3000),
    }, decodeObject)
    return {
      max: hrefOf(data.max, fallback.max),
      telegram: hrefOf(data.telegram, fallback.telegram),
      whatsapp: hrefOf(data.whatsapp, fallback.whatsapp),
    }
  } catch (error) {
    unstable_rethrow(error)
    return fallback
  }
}
