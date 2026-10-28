import { NextResponse } from 'next/server'

// Никакого кеша: healthcheck должен отражать состояние процесса здесь и сейчас.
export const dynamic = 'force-dynamic'
export const revalidate = 0

const startedAt = Date.now()

/**
 * Эндпоинт живости для Docker Swarm и внешнего мониторинга.
 *
 * Проверяет процесс независимо от CMS. Готовность каталога проверяет /api/ready:
 * отказ зависимости не должен вызывать бесконечные перезапуски здорового процесса.
 */
export function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      version: process.env.APP_VERSION ?? 'unknown',
      commit: process.env.APP_COMMIT ?? 'unknown',
      buildId: process.env.APP_BUILD_ID ?? 'unknown',
      sourceDirty: process.env.APP_SOURCE_DIRTY === 'true' ? true : process.env.APP_SOURCE_DIRTY === 'false' ? false : null,
      uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    },
  )
}
