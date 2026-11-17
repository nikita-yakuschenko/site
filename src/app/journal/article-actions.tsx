'use client'

import { useState, useSyncExternalStore } from 'react'
import { IconBookmark, IconShare } from '@tabler/icons-react'

const changeEvent = 'journal:saved-change'
function subscribe(callback: () => void) {
  window.addEventListener(changeEvent, callback)
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener(changeEvent, callback)
    window.removeEventListener('storage', callback)
  }
}

export function ArticleActions({ slug, title }: { slug: string; title: string }) {
  const key = `journal:saved:${slug}`
  const saved = useSyncExternalStore(subscribe, () => {
    try { return localStorage.getItem(key) === '1' } catch { return false }
  }, () => false)
  const [message, setMessage] = useState('')
  function toggle() {
    try {
      if (saved) localStorage.removeItem(key)
      else localStorage.setItem(key, '1')
      window.dispatchEvent(new Event(changeEvent))
      setMessage(saved ? 'Удалено из сохранённых' : 'Сохранено в этом браузере')
    } catch { setMessage('Не удалось сохранить материал') }
  }
  async function share() {
    try {
      if (navigator.share) await navigator.share({ title, url: location.href })
      else {
        await navigator.clipboard.writeText(location.href)
        setMessage('Ссылка скопирована')
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) setMessage('Не удалось поделиться ссылкой')
    }
  }
  return <div className="journal-actions">
    <button type="button" aria-pressed={saved} onClick={toggle}><IconBookmark size={18} aria-hidden />{saved ? 'Сохранено' : 'Сохранить'}</button>
    <button type="button" onClick={share}><IconShare size={18} aria-hidden />Поделиться</button>
    <span role="status">{message}</span>
  </div>
}
