import { NextResponse } from 'next/server'

/**
 * Ключ JS API Яндекс.Карт — рантайм-настройка, а не часть сборки.
 *
 * Переменная с префиксом NEXT_PUBLIC_ вшивается в бандл на этапе
 * `next build`, а он идёт внутри `docker build`, куда окружение контейнера
 * не попадает: в Dockerfile для этого пришлось бы заводить ARG и передавать
 * build args из Dokploy. Отдавать ключ отсюда проще и надёжнее — он
 * читается при запросе, и смена ключа не требует пересборки.
 *
 * Секретом значение не является: в браузер оно всё равно уходит вместе с
 * адресом загрузчика карт. Защита — ограничение по HTTP Referer в кабинете.
 */
export const dynamic = 'force-dynamic'

export function GET() {
  return NextResponse.json(
    { key: process.env.NEXT_PUBLIC_YANDEX_MAPS_KEY ?? '' },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
