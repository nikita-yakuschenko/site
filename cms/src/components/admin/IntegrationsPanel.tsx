'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Badge } from '../ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'

const providers = ['roistat', 'bitrix', 'yandex'] as const
type Provider = (typeof providers)[number]

type DeliveryMode = 'disabled' | 'test' | 'webhook' | 'roistat'
const deliveryLabel: Record<DeliveryMode, string> = { disabled: 'Отключена', test: 'Тестовый режим', webhook: 'Вебхук', roistat: 'Через Roistat' }
const modeOptions: { value: DeliveryMode; label: string }[] = [
  { value: 'disabled', label: 'Отключено' },
  { value: 'test', label: 'Тестовый обработчик' },
  { value: 'webhook', label: 'API / вебхук' },
  { value: 'roistat', label: 'Roistat (универсальный вебхук)' },
]

// Inline control that saves the lead-delivery mode via the Payload global REST API
function DeliveryModeControl({ initialMode }: { initialMode: DeliveryMode | null }) {
  const [mode, setMode] = useState<DeliveryMode>(initialMode ?? 'disabled')
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  if (initialMode === null) return <p className="text-sm text-muted-foreground">Нет доступа к настройке отправки.</p>
  async function save(next: DeliveryMode) {
    const previous = mode
    setMode(next)
    setState('saving')
    try {
      const current = await fetch('/api/globals/lead-delivery?depth=0', { credentials: 'include' }).then(response => response.json())
      const { id: _id, globalType: _globalType, createdAt: _createdAt, updatedAt: _updatedAt, ...data } = current
      const response = await fetch('/api/globals/lead-delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...data, mode: next }),
      })
      if (!response.ok) throw new Error()
      setState('saved')
    } catch {
      setMode(previous)
      setState('error')
    }
  }
  return <div className="flex flex-col gap-2 text-sm">
    <span className="font-medium">Способ отправки</span>
    <Select value={mode} disabled={state === 'saving'} onValueChange={value => save(value as DeliveryMode)}>
      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
      <SelectContent>{modeOptions.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
    </Select>
    {state === 'saving' && <span className="text-muted-foreground">Сохранение…</span>}
    {state === 'saved' && <span className="text-muted-foreground">Сохранено</span>}
    {state === 'error' && <span className="text-destructive">Не удалось сохранить</span>}
    {mode === 'webhook' && <Link className="underline-offset-4 hover:underline" href="/globals/lead-delivery">Указать адрес вебхука</Link>}
    <Link className="underline-offset-4 hover:underline" href="/collections/lead-submissions">Отправки форм</Link>
  </div>
}

export function IntegrationsPanel({ deliveryMode, roistatReady }: { deliveryMode: keyof typeof deliveryLabel | null; roistatReady: boolean }) {
  const roistatStatus = deliveryMode === 'roistat' ? (roistatReady ? 'Включена' : 'Нет адреса вебхука') : deliveryMode ? 'Выключена' : 'Нет доступа к настройке'
  const params = useSearchParams()
  const asked = params.get('provider')
  const [provider, setProvider] = useState<Provider>(providers.includes(asked as Provider) ? asked as Provider : 'roistat')
  return <Tabs value={provider} onValueChange={value => {
    const next = value as Provider
    setProvider(next)
    const query = new URLSearchParams(window.location.search)
    query.set('provider', next)
    window.history.replaceState(window.history.state, '', `${window.location.pathname}?${query}${window.location.hash}`)
  }}>
    <TabsList>
      <TabsTrigger value="roistat">Roistat</TabsTrigger>
      <TabsTrigger value="bitrix">Битрикс24</TabsTrigger>
      <TabsTrigger value="yandex">Яндекс</TabsTrigger>
    </TabsList>
    <TabsContent value="roistat" className="grid gap-4 md:grid-cols-2">
      <ProviderCard title="Передача заявок" status={roistatStatus} text={`Каждая заявка с сайта уходит в универсальный вебхук Roistat с номером визита и названием сделки. Адрес вебхука в окружении CMS: ${roistatReady ? 'задан' : 'не задан'}.`}>
        <DeliveryModeControl initialMode={deliveryMode} />
      </ProviderCard>
      <ProviderCard title="Счётчик на сайте" status="Подключён" text="Счётчик Roistat стоит на сайте с первого захода и связывает визит с рекламным источником. Проект тот же, что у старого сайта." />
    </TabsContent>
    <TabsContent value="bitrix" className="grid gap-4 md:grid-cols-2">
      <ProviderCard title="Сделки в CRM" status={deliveryMode ? deliveryLabel[deliveryMode] : 'Нет доступа к настройке'} text={deliveryMode === 'roistat' ? 'Сделку в Битрикс24 создаёт Roistat через свою интеграцию «Битрикс24 (Сделки)».' : 'Формы сайта передают обращения через общий обработчик. Для сделок в Битрикс24 выберите отправку через Roistat во вкладке Roistat.'}>
        <Link className="text-sm underline-offset-4 hover:underline" href="/collections/lead-submissions">Отправки форм</Link>
      </ProviderCard>
    </TabsContent>
    <TabsContent value="yandex" className="grid gap-4 md:grid-cols-2">
      <ProviderCard title="Метрика" status="Не подключено" text="Посещаемость всего сайта будет приходить из Метрики. Сейчас в обзоре — открытия карточек проектов, которые сайт считает сам." />
      <ProviderCard title="Директ" status="Не подключено" text="Рекламные кампании и расход. Подключение не настроено, цифр отсюда на обзоре нет." />
    </TabsContent>
  </Tabs>
}

function ProviderCard({ title, status, text, children }: { title: string; status: string; text: string; children?: ReactNode }) {
  return <Card className="shadow-none">
    <CardHeader>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <CardTitle>{title}</CardTitle>
        <Badge variant="outline">{status}</Badge>
      </div>
      <CardDescription>{text}</CardDescription>
    </CardHeader>
    {children ? <CardContent>{children}</CardContent> : null}
  </Card>
}
