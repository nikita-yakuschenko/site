'use client'

import { useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { IconCheck, IconChevronRight, IconPencil, IconPlus, IconTrash, IconX } from '@tabler/icons-react'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { AutomationPanel } from './AutomationPanel'

const providers = ['roistat', 'bitrix', 'yandex', 'services'] as const
type Provider = (typeof providers)[number]
type DeliveryMode = 'test' | 'webhook' | 'roistat'
type Counter = { projectId: string; connectedAt: string; enabled: boolean }
type CounterRow = Counter & { key: string }
export type DeliverySettings = { mode: DeliveryMode; enabled: boolean; webhookUrl: string; counters: Counter[] } | null
export type YandexPanelSettings = { metricaEnabled: boolean; metricaCounterId: string; metricaConnectedAt: string; mapsEnabled: boolean; mapsApiKey: string } | null

// Each editor owns a draft. Only explicit submission changes the saved settings.
function IntegrationEditor({ id, title, label, value, enabled, busy, onSave, validate, children, onDelete, onCancel, initiallyEditing = false }: {
  id: string; title: string; label: string; value: string; enabled: boolean; busy: boolean
  onSave: (value: string, enabled: boolean) => Promise<void>
  validate: (value: string, enabled: boolean) => string
  children?: (editing: boolean) => ReactNode
  onDelete?: () => Promise<void>; onCancel?: () => void; initiallyEditing?: boolean
}) {
  const [editing, setEditing] = useState(initiallyEditing)
  const [draft, setDraft] = useState(value)
  const [draftEnabled, setDraftEnabled] = useState(enabled)
  const [error, setError] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const active = editing ? draftEnabled : enabled

  function cancel() {
    setDraft(value)
    setDraftEnabled(enabled)
    setError('')
    setEditing(false)
    onCancel?.()
  }

  return <section className="flex min-w-0 flex-col gap-5" aria-labelledby={`${id}-title`}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 id={`${id}-title`} className="text-base font-semibold">{title}</h2>
      <div className="flex items-center gap-3">
        {onDelete && <Button type="button" variant="ghost" size="icon" aria-label={`Удалить: ${title}`} title="Удалить" disabled={!editing || busy} onClick={async () => {
          try { await onDelete() } catch { setError('Не удалось удалить. Повторите попытку.') }
        }}><IconTrash /></Button>}
        <div className="flex items-center gap-2">
          <Switch id={`${id}-enabled`} checked={active} disabled={!editing || busy} onCheckedChange={setDraftEnabled} />
          <Label className="w-20" htmlFor={`${id}-enabled`}>{active ? 'Включено' : 'Выключено'}</Label>
        </div>
        <div className="grid w-18 shrink-0 grid-cols-2">
        <Button type="submit" form={`${id}-form`} variant="ghost" size="icon" className={`text-green-700 hover:text-green-800 focus-visible:text-green-800 dark:text-green-400 dark:hover:text-green-300 dark:focus-visible:text-green-300${editing ? '' : ' invisible'}`} aria-label={`Сохранить: ${title}`} title="Сохранить" disabled={!editing || busy}><IconCheck /></Button>
        {editing ? <Button key="cancel" type="button" variant="ghost" size="icon" className="text-destructive hover:text-destructive focus-visible:text-destructive" aria-label={`Отмена: ${title}`} title="Отмена" disabled={busy} onClick={cancel}><IconX /></Button> : <Button key="edit" type="button" variant="ghost" size="icon" aria-label={`Изменить: ${title}`} title="Изменить" disabled={busy} onClick={() => {
          setDraft(value)
          setDraftEnabled(enabled)
          setError('')
          setEditing(true)
          requestAnimationFrame(() => input.current?.focus())
        }}><IconPencil /></Button>}
        </div>
      </div>
    </div>
    <form id={`${id}-form`} className="flex min-w-0 flex-col gap-4" onKeyDown={event => {
      if (event.key === 'Escape' && editing && !busy) { event.preventDefault(); cancel() }
    }} onSubmit={async event => {
      event.preventDefault()
      if (!editing || busy) return
      const message = validate(draft.trim(), draftEnabled)
      setError(message)
      if (message) { input.current?.focus(); return }
      try {
        await onSave(draft.trim(), draftEnabled)
        setEditing(false)
      } catch {
        setError('Не удалось сохранить. Повторите попытку.')
      }
    }}>
      {children?.(editing)}
      <Field>
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <Input ref={input} id={id} value={editing ? draft : value} disabled={!editing || busy} spellCheck={false} autoComplete="off" aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} className="text-sm" style={{ fontFamily: 'var(--font-geist-mono)' }} onChange={event => { setDraft(event.target.value); setError('') }} />
      </Field>
      {error && <p id={`${id}-error`} role="alert" className="text-sm text-destructive">{error}</p>}
    </form>
  </section>
}

export function IntegrationsPanel({ delivery, yandex }: { delivery: DeliverySettings; yandex: YandexPanelSettings }) {
  const params = useSearchParams()
  const asked = params.get('provider')
  const [provider, setProvider] = useState<Provider>(providers.includes(asked as Provider) ? asked as Provider : 'roistat')
  const [mode, setMode] = useState<DeliveryMode>(delivery?.mode ?? 'roistat')
  const [draftMode, setDraftMode] = useState(mode)
  const [enabled, setEnabled] = useState(delivery?.enabled ?? false)
  const [webhookUrl, setWebhookUrl] = useState(delivery?.webhookUrl ?? '')
  const [counters, setCounters] = useState<CounterRow[]>(() => (delivery?.counters ?? []).map((row, index) => ({ ...row, key: `stored-${index}` })))
  const [settings, setSettings] = useState(yandex)
  const [busy, setBusy] = useState(false)
  const saving = useRef(false)
  const bitrixOn = Boolean(delivery) && enabled && mode === 'roistat'

  async function persist(patch: Record<string, unknown>) {
    if (saving.current) throw new Error('Save in progress')
    saving.current = true
    setBusy(true)
    try {
      // Send only this integration's fields; do not overwrite other settings.
      const response = await fetch('/api/globals/lead-delivery', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
      })
      if (!response.ok) throw new Error('Save failed')
    } finally {
      saving.current = false
      setBusy(false)
    }
  }

  async function saveCounters(next: CounterRow[]) {
    await persist({ roistatCounters: next.map(({ projectId, connectedAt, enabled }) => ({ projectId, connectedAt, enabled })) })
    setCounters(next)
  }

  return <Tabs className="gap-6" value={provider} onValueChange={value => {
    if (busy) return
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
      <TabsTrigger value="services">Сервисы</TabsTrigger>
    </TabsList>
    <TabsContent value="roistat">
      <Card className="shadow-none"><CardContent className="flex flex-col gap-8 py-6">
        {delivery ? <>
          <IntegrationEditor id="roistat-webhook-url" title="Передача заявок" label="Адрес вебхука Roistat" value={webhookUrl} enabled={enabled} busy={busy}
            validate={(value, active) => draftMode === 'roistat' ? (!value && active ? 'Укажите адрес вебхука' : roistatWebhookUrlError(value)) : ''}
            onCancel={() => setDraftMode(mode)}
            onSave={async (value, active) => {
              await persist({ mode: draftMode, deliveryEnabled: active, roistatWebhookUrl: value })
              setMode(draftMode); setEnabled(active); setWebhookUrl(value)
            }}>
            {editing => <Field>
              <FieldLabel htmlFor="lead-delivery-mode">Способ отправки</FieldLabel>
              <Select value={editing ? draftMode : mode} disabled={!editing || busy} onValueChange={value => setDraftMode(value as DeliveryMode)}>
                <SelectTrigger id="lead-delivery-mode" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="roistat">Roistat (универсальный вебхук)</SelectItem>
                  <SelectItem value="webhook">API / вебхук</SelectItem>
                  <SelectItem value="test">Тестовый обработчик</SelectItem>
                </SelectContent>
              </Select>
              {(editing ? draftMode : mode) === 'webhook' && <Button asChild variant="link" className="h-auto justify-start px-0"><Link href="/globals/lead-delivery">Настроить API / вебхук<IconChevronRight /></Link></Button>}
            </Field>}
          </IntegrationEditor>
          <Button asChild variant="outline" size="sm" className="self-end"><Link href="/leads">Заявки<IconChevronRight /></Link></Button>
          <Separator />
          {counters.map((row, index) => <div key={row.key} className="flex flex-col gap-8">
            <IntegrationEditor id={`counter-${row.key}`} title={counters.length > 1 ? `Счётчик Roistat ${index + 1}` : 'Счётчик Roistat'} label="Номер проекта" value={row.projectId} enabled={row.enabled} busy={busy} initiallyEditing={!row.projectId}
              validate={value => !/^[a-zA-Z0-9]{8,64}$/.test(value) ? 'Укажите идентификатор проекта: от 8 до 64 латинских букв и цифр' : counters.some(item => item.key !== row.key && item.projectId === value) ? 'Этот счётчик уже добавлен' : ''}
              onSave={async (value, active) => {
                await saveCounters(counters.map(item => item.key === row.key ? { ...item, projectId: value, enabled: active } : item).filter(item => item.projectId))
              }}
              onCancel={!row.projectId ? () => setCounters(current => current.filter(item => item.key !== row.key)) : undefined}
              onDelete={counters.filter(item => item.projectId).length > 1 && row.projectId ? () => saveCounters(counters.filter(item => item.key !== row.key && item.projectId)) : undefined}
            />
            {index < counters.length - 1 && <Separator />}
          </div>)}
          <Button type="button" variant="outline" size="sm" className="self-start" disabled={busy || counters.some(row => !row.projectId)} onClick={() => setCounters(current => [...current, { key: crypto.randomUUID(), projectId: '', connectedAt: '', enabled: false }])}><IconPlus />Добавить счётчик</Button>
        </> : <p className="text-sm text-muted-foreground">Нет доступа к настройкам Roistat.</p>}
      </CardContent></Card>
    </TabsContent>
    <TabsContent value="bitrix">
      <Card className="shadow-none"><CardContent className="flex flex-col gap-5 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Сделки в CRM</h2>
          <Badge variant="outline">{bitrixOn ? 'Передача через Roistat включена' : 'Передача через Roistat выключена'}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">Сделки создаются через интеграцию Roistat с Битрикс24.</p>
        <Button asChild variant="outline" size="sm" className="self-start"><Link href="/leads">Заявки<IconChevronRight /></Link></Button>
      </CardContent></Card>
    </TabsContent>
    <TabsContent value="yandex">
      <Card className="shadow-none"><CardContent className="flex flex-col gap-8 py-6">
        {settings ? <>
          <IntegrationEditor id="metrica-counter-id" title="Метрика" label="Номер счётчика" value={settings.metricaCounterId} enabled={settings.metricaEnabled} busy={busy}
            validate={(value, active) => !value && !active || /^\d{6,12}$/.test(value) ? '' : 'Укажите номер счётчика: от 6 до 12 цифр'}
            onSave={async (value, active) => {
              await persist({ metricaCounterId: value, metricaEnabled: active })
              setSettings(current => current && { ...current, metricaCounterId: value, metricaEnabled: active })
            }} />
          <Separator />
          <IntegrationEditor id="maps-api-key" title="Карты" label="Ключ API" value={settings.mapsApiKey} enabled={settings.mapsEnabled} busy={busy}
            validate={(value, active) => !value && !active || /^[a-zA-Z0-9-]{20,80}$/.test(value) ? '' : 'Укажите корректный ключ API Яндекс.Карт'}
            onSave={async (value, active) => {
              await persist({ mapsApiKey: value, mapsEnabled: active })
              setSettings(current => current && { ...current, mapsApiKey: value, mapsEnabled: active })
            }} />
        </> : <p className="text-sm text-muted-foreground">Нет доступа к настройкам Яндекса.</p>}
        <Separator />
        <section className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Директ</h2>
          <Badge variant="outline">Не настроено</Badge>
        </section>
      </CardContent></Card>
    </TabsContent>
    <TabsContent value="services"><AutomationPanel section="dmp" /></TabsContent>
  </Tabs>
}
