import { NextResponse } from 'next/server'

// Никакого кеша: healthcheck должен отражать состояние процесса здесь и сейчас.
export const dynamic = 'force-dynamic'
export const revalidate = 0

const startedAt = Date.now()

/**
 * Эндпоинт живости для Docker Swarm и внешнего мониторинга.
 *
 * Сейчас проверяет только то, что процесс отвечает. По мере появления
 * зависимостей (база, хранилище медиа) сюда добавляются их проверки,
 * и ответ становится 503, когда критичная зависимость недоступна.
 */
export function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      version: process.env.APP_VERSION ?? 'unknown',
      commit: process.env.APP_COMMIT ?? 'unknown',
      uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    },
  )
}
