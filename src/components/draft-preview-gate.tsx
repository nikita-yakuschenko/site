'use client'

import { useEffect, useState, type ReactNode } from 'react'

/** Черновое превью CMS скрыто, пока CMS не передала данные проекта: без этого мелькает заглушка «Без названия». */
export function DraftPreviewGate({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const [ready, setReady] = useState(!enabled)
  useEffect(() => {
    if (!enabled) return
    const receive = (event: MessageEvent) => { if (event.source === window.parent && event.data?.type === 'avgst:preview-hero') setReady(true) }
    window.addEventListener('message', receive)
    // Unsaved form without hero data must still show the placeholders
    const timer = setTimeout(() => setReady(true), 2000)
    return () => { window.removeEventListener('message', receive); clearTimeout(timer) }
  }, [enabled])
  if (!enabled) return children
  return <div style={{ visibility: ready ? 'visible' : 'hidden' }}>{children}</div>
}
