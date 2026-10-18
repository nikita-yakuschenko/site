'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { IconArrowRight } from '@tabler/icons-react'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import { Field, FieldLabel } from '../ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Separator } from '../ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'

const providers = ['roistat', 'bitrix', 'yandex'] as const
type Provider = (typeof providers)[number]
type DeliveryMode = 'disabled' | 'test' | 'webhook' | 'roistat'
type Tone = 'on' | 'off' | 'warn'

const deliveryLabel: Record<DeliveryMode, string> = { disabled: 'Отключена', test: 'Тестовый режим', webhook: 'Вебхук', roistat: 'Через Roistat' }
const modeOptions: { value: DeliveryMode; label: string }[] = [
  { value: 'disabled', label: 'Отключено' },
  { value: 'test', label: 'Тестовый обработчик' },
  { value: 'webhook', label: 'API / вебхук' },
  { value: 'roistat', label: 'Roistat (универсальный вебхук)' },
]

function StatusBadge({ tone, children }: { tone: Tone; children: string }) {
  return <Badge variant={tone === 'on' ? 'default' : tone === 'warn' ? 'destructive' : 'outline'}>{children}</Badge>
}

function IntegrationRow({ title, status, tone, text, children }: { title: string; status: string; tone: Tone; text: string; children?: ReactNode }) {
  return <section className="flex flex-col gap-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 space-y-1">
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="max-w-prose text-sm text-muted-foreground">{text}</p>
      </div>
      <StatusBadge tone={tone}>{status}</StatusBadge>
    </div>
    {children}
  </section>
}

function SubmissionsLink() {
  return <Button asChild variant="outline" size="sm"><Link href="/collections/lead-submissions">Отправки форм<IconArrowRight /></Link></Button>
}

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
  return <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <Field className="max-w-sm">
      <FieldLabel htmlFor="lead-delivery-mode">Способ отправки</FieldLabel>
      <Select value={mode} disabled={state === 'saving'} onValueChange={value => save(value as DeliveryMode)}>
        <SelectTrigger id="lead-delivery-mode" className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent>{modeOptions.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
      </Select>
      {state === 'saving' && <p className="text-sm text-muted-foreground">Сохранение…</p>}
      {state === 'saved' && <p className="text-sm text-muted-foreground">Сохранено</p>}
      {state === 'error' && <p className="text-sm text-destructive">Не удалось сохранить</p>}
      {mode === 'webhook' && <Button asChild variant="link" className="h-auto justify-start px-0"><Link href="/globals/lead-delivery">Указать адрес вебхука</Link></Button>}
    </Field>
    <SubmissionsLink />
  </div>
}

export function IntegrationsPanel({ deliveryMode, roistatReady }: { deliveryMode: DeliveryMode | null; roistatReady: boolean }) {
  const params = useSearchParams()
  const asked = params.get('provider')
  const [provider, setProvider] = useState<Provider>(providers.includes(asked as Provider) ? asked as Provider : 'roistat')
  const deliveryTone: Tone = deliveryMode === 'roistat' ? (roistatReady ? 'on' : 'warn') : 'off'
  const deliveryStatus = deliveryMode === 'roistat' ? (roistatReady ? 'Включена' : 'Нет адреса вебхука') : deliveryMode ? 'Выключена' : 'Нет доступа'
  const bitrixOn = deliveryMode === 'roistat'
  return <Tabs className="gap-6" value={provider} onValueChange={value => {
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
    <TabsContent value="roistat">
      <Card className="shadow-none">
        <CardContent className="flex flex-col gap-8 py-6">
          <IntegrationRow title="Передача заявок" status={deliveryStatus} tone={deliveryTone} text={roistatReady ? 'Заявки с сайта уходят в Roistat и становятся сделками в Битрикс24. Адрес вебхука задан в окружении CMS.' : 'Заявки с сайта уходят в Roistat и становятся сделками в Битрикс24. Адрес вебхука в окружении CMS не задан.'}>
            <DeliveryModeControl initialMode={deliveryMode} />
          </IntegrationRow>
          <Separator />
          <IntegrationRow title="Счётчик на сайте" status="Подключён" tone="on" text="Счётчик грузится до баннера и связывает визит с рекламным источником. Проект тот же, что у старого сайта." />
        </CardContent>
      </Card>
    </TabsContent>
    <TabsContent value="bitrix">
      <Card className="shadow-none">
        <CardContent className="flex flex-col gap-6 py-6">
          <IntegrationRow title="Сделки в CRM" status={bitrixOn ? 'Через Roistat' : deliveryMode ? deliveryLabel[deliveryMode] : 'Нет доступа'} tone={bitrixOn ? 'on' : 'off'} text={bitrixOn ? 'Сделку в Битрикс24 создаёт Roistat через интеграцию «Битрикс24 (Сделки)».' : 'Чтобы сделки создавались в Битрикс24, во вкладке Roistat выберите отправку через универсальный вебхук.'}>
            <SubmissionsLink />
          </IntegrationRow>
        </CardContent>
      </Card>
    </TabsContent>
    <TabsContent value="yandex">
      <Card className="shadow-none">
        <CardContent className="flex flex-col gap-8 py-6">
          <IntegrationRow title="Метрика" status="Не подключено" tone="off" text="Посещаемость всего сайта появится после подключения. Сейчас в обзоре — открытия карточек проектов, которые сайт считает сам." />
          <Separator />
          <IntegrationRow title="Директ" status="Не подключено" tone="off" text="Рекламные кампании и расход. Подключение ещё не настроено." />
        </CardContent>
      </Card>
    </TabsContent>
  </Tabs>
}
