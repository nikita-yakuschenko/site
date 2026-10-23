import type { CatalogProject } from './catalog/types'

/**
 * Поделиться проектом.
 *
 * Системное меню, если браузер его даёт, иначе адрес уходит в буфер обмена.
 * Отказ пользователя в системном меню — не ошибка, поэтому AbortError гасим
 * молча, а на прочие сбои всё равно пробуем буфер.
 */
export async function shareProject(project: CatalogProject): Promise<boolean> {
  const sharedUrl = new URL(project.href, window.location.origin)
  sharedUrl.searchParams.set('share', '1')
  const url = sharedUrl.href
  const payload = { title: project.name, text: `Проект «${project.name}»`, url }
  try {
    if (typeof navigator.share === 'function') {
      await navigator.share(payload)
      return true
    }
    await navigator.clipboard.writeText(url)
    return true
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return false
    try {
      await navigator.clipboard.writeText(url)
      return true
    } catch (clipboardError) {
      console.error(clipboardError)
      return false
    }
  }
}
