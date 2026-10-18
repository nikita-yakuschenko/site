'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { IconCheck, IconChevronRight, IconCopy, IconPlus, IconTrash } from '@tabler/icons-react'
import { roistatWebhookUrlError } from '../../config/lead-adapters'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import { Field, FieldLabel } from '../ui/field'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Separator } from '../ui/separator'
import { Switch } from '../ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'

const providers = ['roistat', 'bitrix', 'yandex'] as const
type Provider = (typeof providers)[number]
type DeliveryMode = 'test' | 'webhook' | 'roistat'
type Tone = 'on' | 'off' | 'warn'
type CounterRow = { key: string; projectId: string; connectedAt: string; enabled: boolean }

export type DeliverySettings = {
  mode: DeliveryMode
  enabled: boolean
  webhookUrl: string
  counters: { projectId: string; connectedAt: string; enabled: boolean }[]
} | null

export type YandexPanelSettings = {
  metricaEnabled: boolean
  metricaCounterId: string
  metricaConnectedAt: string
  mapsEnabled: boolean
  mapsApiKey: string
} | null

const deliveryLabel: Record<DeliveryMode, string> = { test: 'Тестовый режим', webhook: 'Вебхук', roistat: 'Через Roistat' }
const modeOptions: { value: DeliveryMode; label: string }[] = [
  { value: 'roistat', label: 'Roistat (универсальный вебхук)' },
  { value: 'webhook', label: 'API / вебхук' },
  { value: 'test', label: 'Тестовый обработчик' },
]

function StatusBadge({ tone, children }: { tone: Tone; children: string }) {
  return <Badge variant={tone === 'on' ? 'default' : tone === 'warn' ? 'destructive' : 'outline'}>{children}</Badge>
}

function IntegrationRow({ title, status, tone, text, aside, children }: { title: string; status?: string; tone?: Tone; text: string; aside?: ReactNode; children?: ReactNode }) {
  return <section className="flex flex-col gap-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 space-y-1">
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="max-w-prose text-sm text-muted-foreground">{text}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {aside}
        {status && tone ? <StatusBadge tone={tone}>{status}</StatusBadge> : null}
      </div>
    </div>
    {children}
  </section>
}

function TokenField({ id, value, onChange, onBlur, copyLabel, placeholder }: { id: string; value: string; onChange: (value: string) => void; onBlur?: (value: string) => void; copyLabel: string; placeholder?: string }) {
  const [copied, setCopied] = useState(false)
  return <div className="flex gap-2">
    <Input id={id} value={value} placeholder={placeholder} spellCheck={false} autoComplete="off" className="font-mono text-sm" onChange={event => onChange(event.target.value)} onBlur={event => onBlur?.(event.target.value)} />
    <Button type="button" variant="outline" size="icon" aria-label={copyLabel} disabled={!value.trim()} onClick={async () => {
      await navigator.clipboard.writeText(value.trim())
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    }}>{copied ? <IconCheck /> : <IconCopy />}</Button>
  </div>
}

function rowsFrom(settings: DeliverySettings): CounterRow[] {
  return (settings?.counters ?? []).map(row => ({ ...row, key: crypto.randomUUID() }))
}

export function IntegrationsPanel({ delivery, yandex }: { delivery: DeliverySettings; yandex: YandexPanelSettings }) {
  const params = useSearchParams()
  const asked = params.get('provider')
  const [provider, setProvider] = useState<Provider>(providers.includes(asked as Provider) ? asked as Provider : 'roistat')
  const [mode, setMode] = useState<DeliveryMode>(delivery?.mode ?? 'roistat')
  const [enabled, setEnabled] = useState(delivery?.enabled ?? false)
  const [webhookUrl, setWebhookUrl] = useState(delivery?.webhookUrl ?? '')
  const [counters, setCounters] = useState<CounterRow[]>(() => rowsFrom(delivery))
  const [metricaEnabled, setMetricaEnabled] = useState(yandex?.metricaEnabled ?? true)
  const [metricaCounterId, setMetricaCounterId] = useState(yandex?.metricaCounterId ?? '')
  const [metricaConnectedAt, setMetricaConnectedAt] = useState(yandex?.metricaConnectedAt ?? '')
  const [mapsEnabled, setMapsEnabled] = useState(yandex?.mapsEnabled ?? true)
  const [mapsApiKey, setMapsApiKey] = useState(yandex?.mapsApiKey ?? '')
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [yandexState, setYandexState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [webhookError, setWebhookError] = useState('')
  const [metricaError, setMetricaError] = useState('')
  const [mapsError, setMapsError] = useState('')
  const bitrixOn = Boolean(delivery) && enabled && mode === 'roistat'
  const activeCounters = counters.filter(row => row.enabled && row.projectId.trim()).length
  const metricaOn = Boolean(yandex) && metricaEnabled && /^\d{6,12}$/.test(metricaCounterId.trim())
  const mapsOn = Boolean(yandex) && mapsEnabled && /^[a-zA-Z0-9-]{20,80}$/.test(mapsApiKey.trim())

  async function persist(next: { mode: DeliveryMode; enabled: boolean; webhookUrl: string; counters: CounterRow[] }) {
    if (!delivery) return
    const urlError = next.mode === 'roistat' ? roistatWebhookUrlError(next.webhookUrl) : ''
    setWebhookError(urlError)
    if (urlError) {
      setState('error')
      return
    }
    const previous = { mode, enabled, webhookUrl, counters }
    setMode(next.mode)
    setEnabled(next.enabled)
    setWebhookUrl(next.webhookUrl)
    setCounters(next.counters)
    setState('saving')
    try {
      const current = await fetch('/api/globals/lead-delivery?depth=0', { credentials: 'include' }).then(response => response.json())
      const { id: _id, globalType: _globalType, createdAt: _createdAt, updatedAt: _updatedAt, ...data } = current
      const stored = next.counters.filter(row => /^[a-zA-Z0-9]{8,64}$/.test(row.projectId.trim())).map(row => ({ projectId: row.projectId.trim(), connectedAt: row.connectedAt, enabled: row.enabled }))
      const response = await fetch('/api/globals/lead-delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...data, mode: next.mode, deliveryEnabled: next.enabled, roistatWebhookUrl: next.webhookUrl.trim(), roistatCounters: stored }),
      })
      if (!response.ok) throw new Error()
      setState('saved')
    } catch {
      setMode(previous.mode)
      setEnabled(previous.enabled)
      setWebhookUrl(previous.webhookUrl)
      setCounters(previous.counters)
      setState('error')
    }
  }

  async function persistYandex(next: { metricaEnabled: boolean; metricaCounterId: string; metricaConnectedAt: string; mapsEnabled: boolean; mapsApiKey: string }) {
    if (!yandex) return
    const counter = next.metricaCounterId.trim()
    const key = next.mapsApiKey.trim()
    const counterError = counter && !/^\d{6,12}$/.test(counter) ? 'Укажите номер счётчика цифрами' : ''
    const keyError = key && !/^[a-zA-Z0-9-]{20,80}$/.test(key) ? 'Укажите ключ JS API Яндекс.Карт' : ''
    setMetricaError(counterError)
    setMapsError(keyError)
    if (counterError || keyError) {
      setYandexState('error')
      return
    }
    const previous = { metricaEnabled, metricaCounterId, metricaConnectedAt, mapsEnabled, mapsApiKey }
    setMetricaEnabled(next.metricaEnabled)
    setMetricaCounterId(next.metricaCounterId)
    setMetricaConnectedAt(next.metricaConnectedAt)
    setMapsEnabled(next.mapsEnabled)
    setMapsApiKey(next.mapsApiKey)
    setYandexState('saving')
    try {
      const current = await fetch('/api/globals/lead-delivery?depth=0', { credentials: 'include' }).then(response => response.json())
      const { id: _id, globalType: _globalType, createdAt: _createdAt, updatedAt: _updatedAt, ...data } = current
      const response = await fetch('/api/globals/lead-delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...data,
          metricaEnabled: next.metricaEnabled,
          metricaCounterId: counter,
          metricaConnectedAt: next.metricaConnectedAt.trim(),
          mapsEnabled: next.mapsEnabled,
          mapsApiKey: key,
        }),
      })
      if (!response.ok) throw new Error()
      setYandexState('saved')
    } catch {
      setMetricaEnabled(previous.metricaEnabled)
      setMetricaCounterId(previous.metricaCounterId)
      setMetricaConnectedAt(previous.metricaConnectedAt)
      setMapsEnabled(previous.mapsEnabled)
      setMapsApiKey(previous.mapsApiKey)
      setYandexState('error')
    }
  }

  function updateCounter(key: string, patch: Partial<CounterRow>, save: boolean) {
    const next = counters.map(row => row.key === key ? { ...row, ...patch } : row)
    setCounters(next)
    if (save) void persist({ mode, enabled, webhookUrl, counters: next })
  }

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
          <IntegrationRow
            title="Передача заявок"
            text="Заявки с сайта уходят в Roistat и становятся сделками в Битрикс24. Адрес вебхука можно сменить здесь, без правки окружения сервера."
            aside={delivery ? <div className="flex items-center space-x-2">
              <Switch id="lead-delivery-enabled" checked={enabled} disabled={state === 'saving'} onCheckedChange={value => void persist({ mode, enabled: value, webhookUrl, counters })} />
              <Label htmlFor="lead-delivery-enabled">{enabled ? 'Включена' : 'Выключена'}</Label>
            </div> : null}
          >
            {delivery ? <div className="flex flex-col gap-4">
              <div className={mode === 'roistat' ? 'grid gap-4 lg:grid-cols-2' : 'max-w-md'}>
                <Field>
                  <FieldLabel htmlFor="lead-delivery-mode">Способ отправки</FieldLabel>
                  <Select value={mode} disabled={state === 'saving'} onValueChange={value => void persist({ mode: value as DeliveryMode, enabled, webhookUrl, counters })}>
                    <SelectTrigger id="lead-delivery-mode" className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>{modeOptions.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                  </Select>
                  {mode === 'webhook' && <Button asChild variant="link" className="h-auto justify-start px-0"><Link href="/globals/lead-delivery">Указать адрес вебхука</Link></Button>}
                </Field>
                {mode === 'roistat' && <Field>
                  <FieldLabel htmlFor="roistat-webhook-url">Адрес вебхука</FieldLabel>
                  <TokenField id="roistat-webhook-url" value={webhookUrl} placeholder="https://cloud.roistat.com/…" copyLabel="Скопировать адрес вебхука" onChange={value => { setWebhookUrl(value); setWebhookError('') }} onBlur={value => { if (value.trim() !== (delivery.webhookUrl || '').trim()) void persist({ mode, enabled, webhookUrl: value, counters }) }} />
                  {webhookError ? <p className="text-sm text-destructive">{webhookError}</p> : <p className="text-xs text-muted-foreground">Универсальный вебхук из кабинета Roistat.</p>}
                </Field>}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-h-5 text-sm">
                  {state === 'saving' && <span className="text-muted-foreground">Сохранение…</span>}
                  {state === 'saved' && <span className="text-muted-foreground">Сохранено</span>}
                  {state === 'error' && !webhookError && <span className="text-destructive">Не удалось сохранить</span>}
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href="/leads">Заявки<IconChevronRight /></Link>
                </Button>
              </div>
            </div> : <p className="text-sm text-muted-foreground">Нет доступа к настройке отправки.</p>}
          </IntegrationRow>
          <Separator />
          <IntegrationRow
            title="Счётчики на сайте"
            text="Номер проекта из кабинета Roistat. На сайте работает первый включённый счётчик."
            aside={delivery ? <StatusBadge tone={activeCounters ? 'on' : 'off'}>{activeCounters ? 'Подключены' : 'Выключены'}</StatusBadge> : null}
          >
            {delivery ? <div className="flex flex-col gap-3">
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-72">Номер</TableHead>
                      <TableHead className="w-44">Дата подключения</TableHead>
                      <TableHead className="w-40">Статус</TableHead>
                      <TableHead className="w-12"><span className="sr-only">Удалить</span></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {counters.map(row => <TableRow key={row.key}>
                      <TableCell className="whitespace-normal align-middle">
                        <TokenField id={`counter-${row.key}`} value={row.projectId} placeholder="Идентификатор проекта" copyLabel="Скопировать номер счётчика" onChange={value => updateCounter(row.key, { projectId: value }, false)} onBlur={value => void persist({ mode, enabled, webhookUrl, counters: counters.map(item => item.key === row.key ? { ...item, projectId: value } : item) })} />
                      </TableCell>
                      <TableCell className="align-middle">
                        <Input type="date" aria-label="Дата подключения" value={row.connectedAt} className="w-40" onChange={event => updateCounter(row.key, { connectedAt: event.target.value }, true)} />
                      </TableCell>
                      <TableCell className="align-middle">
                        <div className="flex items-center space-x-2">
                          <Switch id={`counter-enabled-${row.key}`} checked={row.enabled} disabled={state === 'saving'} onCheckedChange={value => updateCounter(row.key, { enabled: value }, true)} />
                          <Label htmlFor={`counter-enabled-${row.key}`}>{row.enabled ? 'Подключён' : 'Выключен'}</Label>
                        </div>
                      </TableCell>
                      <TableCell className="align-middle">
                        {counters.length > 1 && <Button type="button" variant="ghost" size="icon" aria-label="Удалить счётчик" onClick={() => void persist({ mode, enabled, webhookUrl, counters: counters.filter(item => item.key !== row.key) })}><IconTrash /></Button>}
                      </TableCell>
                    </TableRow>)}
                  </TableBody>
                </Table>
              </div>
              <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => setCounters(current => [...current, { key: crypto.randomUUID(), projectId: '', connectedAt: new Date().toISOString().slice(0, 10), enabled: false }])}><IconPlus />Добавить счётчик</Button>
            </div> : <p className="text-sm text-muted-foreground">Нет доступа к счётчикам.</p>}
          </IntegrationRow>
        </CardContent>
      </Card>
    </TabsContent>
    <TabsContent value="bitrix">
      <Card className="shadow-none">
        <CardContent className="flex flex-col gap-6 py-6">
          <IntegrationRow
            title="Сделки в CRM"
            status={bitrixOn ? 'Через Roistat' : !delivery ? 'Нет доступа' : enabled ? deliveryLabel[mode] : 'Выключена'}
            tone={bitrixOn ? 'on' : 'off'}
            text={bitrixOn ? 'Сделку в Битрикс24 создаёт Roistat через интеграцию «Битрикс24 (Сделки)».' : 'Чтобы сделки создавались в Битрикс24, во вкладке Roistat включите передачу и выберите универсальный вебхук.'}
            aside={delivery ? <Button asChild variant="outline" size="sm"><Link href="/leads">Заявки<IconChevronRight /></Link></Button> : null}
          />
        </CardContent>
      </Card>
    </TabsContent>
    <TabsContent value="yandex">
      <Card className="shadow-none">
        <CardContent className="flex flex-col gap-8 py-6">
          <IntegrationRow
            title="Метрика"
            text="Номер счётчика из кабинета Яндекс.Метрики. Сайт подхватывает его без правки окружения сервера."
            aside={yandex ? <div className="flex items-center space-x-2">
              <Switch id="metrica-enabled" checked={metricaEnabled} disabled={yandexState === 'saving'} onCheckedChange={value => void persistYandex({ metricaEnabled: value, metricaCounterId, metricaConnectedAt, mapsEnabled, mapsApiKey })} />
              <Label htmlFor="metrica-enabled">{metricaEnabled ? 'Включена' : 'Выключена'}</Label>
            </div> : null}
            status={yandex ? (metricaOn ? 'Подключена' : metricaEnabled ? 'Нет номера' : 'Выключена') : undefined}
            tone={yandex ? (metricaOn ? 'on' : 'off') : undefined}
          >
            {yandex ? <div className="flex flex-col gap-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="metrica-counter-id">Номер счётчика</FieldLabel>
                  <TokenField id="metrica-counter-id" value={metricaCounterId} placeholder="112879989" copyLabel="Скопировать номер счётчика" onChange={value => { setMetricaCounterId(value); setMetricaError('') }} onBlur={value => { if (value.trim() !== (yandex.metricaCounterId || '').trim()) void persistYandex({ metricaEnabled, metricaCounterId: value, metricaConnectedAt, mapsEnabled, mapsApiKey }) }} />
                  {metricaError ? <p className="text-sm text-destructive">{metricaError}</p> : <p className="text-xs text-muted-foreground">Только цифры, как в кабинете Метрики.</p>}
                </Field>
                <Field>
                  <FieldLabel htmlFor="metrica-connected-at">Дата подключения</FieldLabel>
                  <Input id="metrica-connected-at" type="date" value={metricaConnectedAt} className="w-full max-w-xs" onChange={event => void persistYandex({ metricaEnabled, metricaCounterId, metricaConnectedAt: event.target.value, mapsEnabled, mapsApiKey })} />
                </Field>
              </div>
              <div className="min-h-5 text-sm">
                {yandexState === 'saving' && <span className="text-muted-foreground">Сохранение…</span>}
                {yandexState === 'saved' && <span className="text-muted-foreground">Сохранено</span>}
                {yandexState === 'error' && !metricaError && !mapsError && <span className="text-destructive">Не удалось сохранить</span>}
              </div>
            </div> : <p className="text-sm text-muted-foreground">Нет доступа к настройке Метрики.</p>}
          </IntegrationRow>
          <Separator />
          <IntegrationRow
            title="Карты"
            text="Ключ JavaScript API Яндекс.Карт для карты офиса. Ограничение по HTTP Referer задаётся в кабинете разработчика."
            aside={yandex ? <div className="flex items-center space-x-2">
              <Switch id="maps-enabled" checked={mapsEnabled} disabled={yandexState === 'saving'} onCheckedChange={value => void persistYandex({ metricaEnabled, metricaCounterId, metricaConnectedAt, mapsEnabled: value, mapsApiKey })} />
              <Label htmlFor="maps-enabled">{mapsEnabled ? 'Включены' : 'Выключены'}</Label>
            </div> : null}
            status={yandex ? (mapsOn ? 'Подключены' : mapsEnabled ? 'Нет ключа' : 'Выключены') : undefined}
            tone={yandex ? (mapsOn ? 'on' : 'off') : undefined}
          >
            {yandex ? <Field className="max-w-2xl">
              <FieldLabel htmlFor="maps-api-key">Ключ API</FieldLabel>
              <TokenField id="maps-api-key" value={mapsApiKey} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" copyLabel="Скопировать ключ API" onChange={value => { setMapsApiKey(value); setMapsError('') }} onBlur={value => { if (value.trim() !== (yandex.mapsApiKey || '').trim()) void persistYandex({ metricaEnabled, metricaCounterId, metricaConnectedAt, mapsEnabled, mapsApiKey: value }) }} />
              {mapsError ? <p className="text-sm text-destructive">{mapsError}</p> : <p className="text-xs text-muted-foreground">Ключ из кабинета разработчика Яндекса.</p>}
            </Field> : <p className="text-sm text-muted-foreground">Нет доступа к ключу карт.</p>}
          </IntegrationRow>
          <Separator />
          <IntegrationRow title="Директ" status="Не подключено" tone="off" text="Рекламные кампании и расход. Подключение ещё не настроено." />
        </CardContent>
      </Card>
    </TabsContent>
  </Tabs>
}
