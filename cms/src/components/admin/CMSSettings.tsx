'use client'
import { useAuth, useField } from '@payloadcms/ui'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Button } from '../ui/button'
import { AutomationPanel } from './AutomationPanel'
export function CMSMailSettings() { return <AutomationPanel section="mail" /> }
export function AccountCMSSettingsLink() {
  const path = usePathname(), { user } = useAuth()
  if (path !== '/account' || user?.role !== 'super-admin') return null
  return <div className="shadcn-surface mb-6"><Button asChild variant="outline"><Link href="/settings">Настройки CMS и отправки писем</Link></Button></div>
}
export function LinkedEventPages() {
  const landing = useField<string>({ path: 'landingUrl' }), [pages, setPages] = useState<{ id: number; title: string }[]>([]), [error, setError] = useState('')
  let url: URL | null = null
  try { const parsed = new URL(landing.value || ''); if (['http:', 'https:'].includes(parsed.protocol)) url = parsed } catch { /* Empty/invalid URL is handled by the regular field. */ }
  const route = url?.pathname || ''
  useEffect(() => {
    const controller = new AbortController()
    if (!route) return
    fetch(`/api/pages?where[route][equals]=${encodeURIComponent(route)}&depth=0&limit=10`, { signal: controller.signal }).then(async r => { if (!r.ok) throw new Error('Не удалось получить связанные страницы'); return r.json() }).then(data => { setPages(data.docs || []); setError('') }).catch(e => { if (e.name !== 'AbortError') setError(e.message) })
    return () => controller.abort()
  }, [route])
  return <div className="shadcn-surface flex flex-col gap-4 rounded-lg border bg-card p-4"><h2 className="text-base font-semibold">Связанные страницы</h2>{url ? <><a className="text-sm underline underline-offset-4" href={url.href} target="_blank" rel="noreferrer">Открыть страницу мероприятия на сайте</a>{pages.map(page => <Button key={page.id} asChild variant="outline" className="w-fit"><Link href={`/collections/pages/${page.id}`}>Редактировать: {page.title}</Link></Button>)}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</> : <p className="text-sm text-muted-foreground">Укажите адрес страницы мероприятия. Здесь появятся ссылки на сайт и редактирование страницы в CMS.</p>}</div>
}
