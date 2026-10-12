'use client'

import { useAuth } from '@payloadcms/ui'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { IconLoader2 as LoaderCircle } from '@tabler/icons-react'
import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '../ui/field'
import { Input } from '../ui/input'

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const { setUser } = useAuth()
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setError('')
    setBusy(true)
    const data = new FormData(event.currentTarget)
    try {
      const response = await fetch('/api/users/login', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: data.get('email'), password: data.get('password') }) })
      if (!response.ok) {
        setError(response.status === 429 ? 'Слишком много попыток. Попробуйте войти позже.' : 'Не удалось войти. Проверьте email и пароль; если доступ заблокирован, обратитесь к администратору.')
        return
      }
      const result = await response.json()
      setUser(result)
      router.replace(redirectTo)
      router.refresh()
    } catch {
      setError('Нет соединения с сервером. Проверьте подключение и попробуйте снова.')
    } finally { setBusy(false) }
  }
  return <div className="shadcn-surface avgst-login flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
    <div className="w-full max-w-sm md:max-w-4xl"><div className="flex flex-col gap-6">
      <Card className="overflow-hidden p-0 shadow-none"><CardContent className="grid p-0 md:grid-cols-2">
        <form className="p-6 md:p-8" onSubmit={login} aria-busy={busy}>
          <FieldGroup>
            <div className="flex flex-col items-center text-center"><span className="avgst-login__logo" role="img" aria-label="Авангард Строй 4.0" /></div>
            <Field><FieldLabel htmlFor="email">Email</FieldLabel><Input id="email" name="email" type="email" autoComplete="username" placeholder="name@avgst.ru" required disabled={busy} /></Field>
            <Field><FieldLabel htmlFor="password">Пароль</FieldLabel><Input id="password" name="password" type="password" autoComplete="current-password" required disabled={busy} /></Field>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Field><Button type="submit" disabled={busy}>{busy && <LoaderCircle className="animate-spin" />}{busy ? 'Входим…' : 'Войти'}</Button></Field>
            <FieldDescription className="text-center">Если вы забыли пароль, обратитесь к администратору.</FieldDescription>
          </FieldGroup>
        </form>
        <div className="relative hidden overflow-hidden bg-muted md:block"><Image src="/login-house.jpg" alt="Дом Авангард Строй" fill sizes="(min-width: 768px) 448px, 0px" className="object-cover" priority /><div className="absolute inset-x-0 bottom-0 bg-[#0b1020]/90 p-6 text-white"><p className="text-lg font-semibold">Авангард Строй 4.0</p><p className="mt-1 text-sm text-white/80">avgst.ru</p></div></div>
      </CardContent></Card>
    </div></div>
  </div>
}
