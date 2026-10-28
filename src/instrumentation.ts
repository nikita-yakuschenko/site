import type { Instrumentation } from 'next'

export const onRequestError: Instrumentation.onRequestError = (_error, request, context) => {
  // Framework errors may contain arbitrary input; log only the framework route template.
  const rawId = request.headers['x-avgst-request-id']
  const id = typeof rawId === 'string' && /^[0-9a-f-]{36}$/i.test(rawId) ? rawId : undefined
  console.error(JSON.stringify({ event: 'server.request.error', requestId: id,
    route: context.routePath, routeType: context.routeType, method: request.method,
    buildId: process.env.APP_BUILD_ID || 'unknown' }))
}
