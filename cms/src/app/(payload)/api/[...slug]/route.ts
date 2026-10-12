import config from '@payload-config'
import { REST_DELETE, REST_GET, REST_OPTIONS, REST_PATCH, REST_POST } from '@payloadcms/next/routes'

export const GET = REST_GET(config)
export const DELETE = REST_DELETE(config)
export const PATCH = REST_PATCH(config)
export const OPTIONS = REST_OPTIONS(config)
const post = REST_POST(config)
// Payload's first-register operation bypasses create access control by design.
// It is never available over HTTP; bootstrap is an infrastructure CLI operation.
export const POST: typeof post = (request, context) => {
  if (/\/users\/first-register\/?$/.test(new URL(request.url).pathname)) {
    return Promise.resolve(Response.json({ error: 'Первичная регистрация доступна только через CLI' }, { status: 403 }))
  }
  return post(request, context)
}
