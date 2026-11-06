import type { Instrumentation } from 'next'
import { reportEvent } from '../../src/lib/monitoring'

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const err = error instanceof Error ? error : new Error(String(error))
  console.error(JSON.stringify({
    event: 'server.request.error',
    app: 'cms',
    route: context.routePath,
    routeType: context.routeType,
    method: request.method,
    revision: process.env.CMS_REVISION || 'unknown',
  }))
  await reportEvent({
    source: 'server',
    app: 'cms',
    message: err.message || 'Unknown CMS error',
    stack: err.stack,
    type: err.name,
    url: request.path,
    method: request.method,
    route: context.routePath,
    extra: { routeType: context.routeType },
  })
}
