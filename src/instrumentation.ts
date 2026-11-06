import type { Instrumentation } from 'next'
import { reportEvent } from './lib/monitoring'

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  // Framework errors may contain arbitrary input; log only the framework route template.
  const rawId = request.headers['x-avgst-request-id']
  const id = typeof rawId === 'string' && /^[0-9a-f-]{36}$/i.test(rawId) ? rawId : undefined
  console.error(JSON.stringify({ event: 'server.request.error', requestId: id,
    route: context.routePath, routeType: context.routeType, method: request.method,
    buildId: process.env.APP_BUILD_ID || 'unknown' }))
  const err = error instanceof Error ? error : new Error(String(error))
  await reportEvent({
    source: 'server',
    app: 'site',
    message: err.message || 'Unknown server error',
    stack: err.stack,
    type: err.name,
    url: request.path,
    method: request.method,
    route: context.routePath,
    extra: { routeType: context.routeType, requestId: id },
  })
}
