import 'server-only'
import { headers } from 'next/headers'
import { unstable_rethrow } from 'next/navigation'
import { requestCMSJSON, type CMSOperation } from '../../server/cms-request'

export async function readCMSJSON<T>(operation: CMSOperation, url: string, init: Parameters<typeof requestCMSJSON>[2], decode: (data: unknown) => T) {
  const incoming = await headers()
  return requestCMSJSON(operation, url, init, decode, {
    requestId: incoming.get('x-avgst-request-id') || undefined,
    route: incoming.get('x-cms-page-route') || undefined,
    rethrow: unstable_rethrow,
  })
}
