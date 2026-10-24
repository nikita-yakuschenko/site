'use client'
import { useAuth, useField } from '@payloadcms/ui'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { AutomationPanel } from './AutomationPanel'
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs'
import { useRouter } from 'next/navigation'
export function CMSMailSettings() { return <AutomationPanel section="mail" /> }
export function SettingsTabs() {
  const path = usePathname(), router = useRouter(), { user } = useAuth()
  return <Tabs value={path === '/settings' ? 'cms' : 'account'} onValueChange={value => router.push(value === 'cms' ? '/settings' : '/account')}><TabsList variant="line"><TabsTrigger value="account">Аккаунт</TabsTrigger>{user?.role === 'super-admin' && <TabsTrigger value="cms">CMS</TabsTrigger>}</TabsList></Tabs>
}
export function AccountSettings() {
  const { user, fetchFullUser } = useAuth()
  const [firstName, setFirstName] = useState(String(user?.firstName || '')), [lastName, setLastName] = useState(String(user?.lastName || ''))
  const [password, setPassword] = useState(''), [confirmation, setConfirmation] = useState(''), [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('')
  return <form className="flex flex-col gap-6 rounded-lg border bg-card p-6" onSubmit={async event => {
    event.preventDefault(); setError(''); setMessage('')
    if (password && password !== confirmation) { setError('Пароли не совпадают'); return }
    setBusy(true)
    try {
      const response = await fetch(`/api/users/${user?.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ firstName, lastName, ...(password ? { password } : {}) }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.errors?.[0]?.message || 'Не удалось сохранить настройки')
      await fetchFullUser(); setPassword(''); setConfirmation(''); setMessage('Настройки аккаунта сохранены')
    } catch (error) { setError((error as Error).message) } finally { setBusy(false) }
  }}><div className="flex flex-col gap-2"><h2 className="text-base font-semibold">Личные данные</h2><p className="text-sm text-muted-foreground">{String(user?.email || '')}</p></div><div className="grid gap-5 sm:grid-cols-2"><div className="flex flex-col gap-2"><Label htmlFor="account-first-name">Имя</Label><Input id="account-first-name" autoComplete="given-name" required disabled={busy} value={firstName} onChange={e => setFirstName(e.target.value)} /></div><div className="flex flex-col gap-2"><Label htmlFor="account-last-name">Фамилия</Label><Input id="account-last-name" autoComplete="family-name" required disabled={busy} value={lastName} onChange={e => setLastName(e.target.value)} /></div></div><div className="flex flex-col gap-4 border-t pt-5"><h2 className="text-base font-semibold">Смена пароля</h2><p className="text-sm text-muted-foreground">Оставьте поля пустыми, чтобы сохранить текущий пароль.</p><div className="grid gap-5 sm:grid-cols-2"><div className="flex flex-col gap-2"><Label htmlFor="account-password">Новый пароль</Label><Input id="account-password" type="password" autoComplete="new-password" minLength={12} disabled={busy} value={password} onChange={e => setPassword(e.target.value)} /></div><div className="flex flex-col gap-2"><Label htmlFor="account-confirmation">Повторите пароль</Label><Input id="account-confirmation" type="password" autoComplete="new-password" required={Boolean(password)} disabled={busy} value={confirmation} onChange={e => setConfirmation(e.target.value)} /></div></div></div>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}{message && <p role="status" className="text-sm">{message}</p>}<Button type="submit" disabled={busy} className="w-fit">{busy ? 'Сохранение…' : 'Сохранить'}</Button></form>
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
