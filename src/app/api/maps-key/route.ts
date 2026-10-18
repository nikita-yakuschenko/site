import { NextResponse } from 'next/server'
import { activeMapsApiKey } from '../../../lib/yandex'

/**
 * Ключ JS API Яндекс.Карт — рантайм-настройка, а не часть сборки.
 *
 * Сначала читается из CMS (Интеграции → Яндекс → Карты). Пока там пусто —
 * запасной NEXT_PUBLIC_YANDEX_MAPS_KEY с окружения сайта, чтобы карта
 * не пропала до первого сохранения в панели.
 *
 * Секретом значение не является: в браузер оно всё равно уходит вместе с
 * адресом загрузчика карт. Защита — ограничение по HTTP Referer в кабинете.
 */
export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(
    { key: await activeMapsApiKey() },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
