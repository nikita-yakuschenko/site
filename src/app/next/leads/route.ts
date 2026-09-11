import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Приём заявок.
 *
 * Хранить заявку пока негде: базы в контуре нет, коллекция Leads появится
 * вместе с Payload в AV4-10. Отвечаем честной 503 — форма покажет ошибку.
 * Это сознательный выбор: молча принять заявку и потерять её хуже, чем
 * показать, что приём ещё не работает. Контур закрыт от индексации и никуда
 * не ведёт, так что живых обращений здесь быть не должно.
 */
export function POST() {
  return NextResponse.json(
    {
      error: 'leads-not-ready',
      message: 'Приём заявок подключается вместе с CMS (AV4-10).',
    },
    { status: 503, headers: { 'Cache-Control': 'no-store' } },
  )
}
