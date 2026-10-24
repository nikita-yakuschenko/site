'use client'

import { DateTimePicker } from './DateTimePicker'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { IconCheck, IconPencil, IconX } from '@tabler/icons-react'
import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Switch } from '../ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import type { AutomationConfig } from '../../automation/model'
import type { ParticipantRow } from './registration-table'
import { ParticipantsIndex } from './ParticipantsIndex'
import { EmailTemplateEditor } from './EmailTemplateEditor'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'

type Section = 'referral' | 'dmp' | 'mail'
type Field = { key: string; label: string; type?: 'number' | 'checkbox' | 'password' | 'textarea'; secret?: boolean }
const fields: Record<Section, Field[]> = {
  dmp: [{ key: 'dryRun', label: 'Проверять без изменения сделок', type: 'checkbox' }, { key: 'sourceCategory', label: 'Исходная воронка (ID)', type: 'number' }, { key: 'sourceStage', label: 'Исходный этап (код)' }, { key: 'sourceName', label: 'Название источника в CRM' }, { key: 'titlePrefix', label: 'Начало названия сделки' }, { key: 'targetCategory', label: 'Целевая воронка (ID)', type: 'number' }, { key: 'targetStage', label: 'Целевой этап (пусто — этап «Новая»)' }, { key: 'targetResponsible', label: 'Ответственный (ID)', type: 'number' }, { key: 'dmpWebhook', label: 'Входящий вебхук Битрикс24', type: 'password', secret: true }, { key: 'dmpAppTokens', label: 'Токены исходящих вебхуков (через запятую)', type: 'password', secret: true }],
  referral: [{ key: 'titleMatch', label: 'Фрагмент названия сделки' }, { key: 'confirmedStage', label: 'Этап после подтверждения' }, { key: 'emailConfirmedField', label: 'Поле CRM: email подтверждён' }, { key: 'participantField', label: 'Поле CRM: участник программы' }, { key: 'linkField', label: 'Поле CRM: реферальная ссылка' }, { key: 'linkTemplate', label: 'Шаблон ссылки — {code} для кода участника' }, { key: 'rulesUrl', label: 'Правила программы' }, { key: 'tokenTtlHours', label: 'Срок ссылки подтверждения, часов', type: 'number' }, { key: 'bitrixWebhook', label: 'Входящий вебхук Битрикс24', type: 'password', secret: true }, { key: 'bitrixAppToken', label: 'Токен исходящего вебхука Битрикс24', type: 'password', secret: true }, { key: 'tokenSecret', label: 'Ключ ссылок подтверждения (изменение отменяет старые ссылки)', type: 'password', secret: true }],
  mail: [{ key: 'host', label: 'Сервер SMTP' }, { key: 'port', label: 'Порт', type: 'number' }, { key: 'secure', label: 'TLS с начала подключения', type: 'checkbox' }, { key: 'user', label: 'Пользователь SMTP' }, { key: 'smtpPassword', label: 'Пароль SMTP', type: 'password', secret: true }, { key: 'from', label: 'Отправитель' }, { key: 'replyTo', label: 'Адрес для ответа' }],
}
async function call(action: string, body?: unknown) {
  const result = await fetch(`/api/automation/${action}`, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : { cache: 'no-store' })
  const value = await result.json()
  if (!result.ok) throw new Error(value.error || 'Не удалось выполнить запрос')
  return value
}
export function AutomationPanel({ section }: { section: Section }) {
  const [config, setConfig] = useState<AutomationConfig | null>(null), [draft, setDraft] = useState<AutomationConfig | null>(null)
  const [configured, setConfigured] = useState<Record<string, boolean>>({}), [secrets, setSecrets] = useState<Record<string, string>>({})
  const [editing, setEditing] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('')
  useEffect(() => { let active = true; call('settings').then(data => { if (active) { setConfig(data.config); setDraft(data.config); setConfigured(data.configured) } }).catch(e => { if (active) setError(e.message) }); return () => { active = false } }, [])
  const title = section === 'dmp' ? 'DMP' : section === 'mail' ? 'Почта и подтверждение email' : 'Реферальная программа'
  function change(key: string, value: unknown) { setDraft(current => current && { ...current, [section]: { ...current[section], [key]: value } }) }
  const shown = editing ? draft : config
  return <Card className="shadow-none"><CardContent className="flex flex-col gap-5 py-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-base font-semibold">{title}</h2><div className="flex items-center gap-3">
      <Switch aria-label={`Включить: ${title}`} checked={shown?.[section].enabled || false} disabled={!editing || busy} onCheckedChange={v => change('enabled', v)} />
      <span className="text-sm">{shown?.[section].enabled ? 'Включено' : 'Выключено'}</span>
      {editing ? <><Button aria-label="Сохранить" size="icon" variant="ghost" type="submit" form={`automation-${section}`} disabled={busy}><IconCheck /></Button><Button aria-label="Отменить" size="icon" variant="ghost" disabled={busy} onClick={() => { setEditing(false); setDraft(config); setSecrets({}); setError('') }}><IconX /></Button></> : <Button aria-label={`Изменить: ${title}`} variant="ghost" size="icon" disabled={!config} onClick={() => { setDraft(structuredClone(config)); setEditing(true); setMessage('') }}><IconPencil /></Button>}
    </div></div>
    <p className="text-sm text-muted-foreground">{section === 'dmp' ? 'Переносит подходящие сделки в целевую воронку. Все условия проверяются одновременно. Повторный вебхук не переносит уже обработанную сделку заново.' : section === 'mail' ? 'Общие настройки писем реферальной программы и мероприятий. Пароли хранятся зашифрованными; пустое поле сохраняет текущий пароль.' : 'Заявка → подтверждение email → код и ссылка участника. Регистрация на мероприятия ведётся независимо.'}</p>
    {shown && <div className={section === 'referral' ? 'automation-referral-editor grid items-start gap-6' : ''}><form id={`automation-${section}`} className={`grid min-w-0 gap-5 ${section === 'mail' ? ' smtp-settings-grid' : ' md:grid-cols-2'}${section === 'referral' ? ' xl:grid-cols-1' : ''}`} onSubmit={async e => { e.preventDefault(); if (!draft) return; setBusy(true); setError(''); try { await call('settings', { section, config: draft, secrets }); const saved = await call('settings'); setConfig(saved.config); setDraft(saved.config); setConfigured(saved.configured); setSecrets({}); setEditing(false); setMessage('Настройки сохранены') } catch (e) { setError((e as Error).message) } finally { setBusy(false) } }}>
      {section === 'referral' && <div className="flex flex-col gap-2 md:col-span-2 xl:col-span-1"><Label htmlFor="crm-domain">Портал Битрикс24</Label><Input id="crm-domain" disabled={!editing || busy} value={shown.crm.domain} onChange={e => setDraft(d => d && { ...d, crm: { domain: e.target.value } })} /></div>}
      {fields[section].map(field => { const id = `${section}-${field.key}`, value = field.secret ? secrets[field.key] || '' : (shown[section] as unknown as Record<string, unknown>)[field.key]; return <div key={field.key} data-setting={field.key} className={field.type === 'checkbox' ? 'flex items-center justify-between gap-4' : 'flex min-w-0 flex-col gap-2'}><Label htmlFor={id}>{field.label}</Label>{field.type === 'checkbox' ? <Switch id={id} disabled={!editing || busy} checked={Boolean(value)} onCheckedChange={v => change(field.key, v)} /> : <Input id={id} type={field.type || 'text'} disabled={!editing || busy} value={String(value ?? '')} placeholder={field.secret && configured[field.key] ? 'Настроено · оставьте пустым для сохранения' : undefined} autoComplete={field.secret ? 'new-password' : 'off'} onChange={e => field.secret ? setSecrets(s => ({ ...s, [field.key]: e.target.value })) : change(field.key, field.type === 'number' ? Number(e.target.value) : e.target.value)} />}</div> })}
    </form>{section === 'referral' && <EmailTemplateEditor disabled={!editing || busy} templates={([
      { key: 'confirmationEmail', label: 'Подтверждение регистрации' },
      { key: 'welcomeEmail', label: 'Код и ссылка участника' },
    ] as const).map(item => ({ ...item, value: shown.referral[item.key], onChange: value => change(item.key, value) }))} variables={{ rules_url: shown.referral.rulesUrl, ttl_hours: String(shown.referral.tokenTtlHours) }} />}</div>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}{message && <p role="status" className="text-sm">{message}</p>}
    {section === 'referral' && <div className="flex flex-wrap gap-3"><Button asChild variant="outline"><Link href="/collections/referral-participants">Участники</Link></Button><Button variant="outline" disabled={busy || editing} onClick={async () => { setBusy(true); setError(''); try { const result = await call('import', {}); setMessage(`Импорт завершён: ${result.contacts} контактов, ${result.referralDeals} заявок рефералки, ${result.eventDeals} регистраций. Письма не отправлялись.`) } catch (e) { setError((e as Error).message) } finally { setBusy(false) } }}>Обновить базу из Битрикс24</Button></div>}
    <Link href="/collections/automation-jobs" className="text-sm underline underline-offset-4">Очередь и журнал обработки</Link>
  </CardContent></Card>
}

export function EventMailing({ eventSlug, timeZone = 'Europe/Moscow' }: { eventSlug: string; timeZone?: string }) {
  const [template, setTemplate] = useState('reminder'), [count, setCount] = useState<number | null>(null), [message, setMessage] = useState(''), [busy, setBusy] = useState(false), [runAt, setRunAt] = useState(''), [campaignId, setCampaignId] = useState('')
  return <div className="flex flex-col gap-4"><h2 className="text-base font-semibold">Рассылка участникам</h2><p className="text-sm text-muted-foreground">Получатели — только подтвердившие регистрацию на это мероприятие. Сначала проверьте количество получателей, затем запланируйте отправку.</p><Label htmlFor={`mail-template-${eventSlug}`}>Письмо</Label><Select value={template} onValueChange={value => { setTemplate(value); setCount(null); setCampaignId('') }}><SelectTrigger id={`mail-template-${eventSlug}`} className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="reminder">Напоминание</SelectItem><SelectItem value="programme">Программа мероприятия</SelectItem></SelectContent></Select><Label htmlFor={`mail-time-${eventSlug}`}>Время отправки (пусто — сразу)</Label><DateTimePicker id={`mail-time-${eventSlug}`} value={runAt} onChange={setRunAt} timeZone={timeZone} disabled={busy} /><div className="flex flex-wrap gap-3"><Button type="button" variant="outline" disabled={busy} onClick={async () => { setBusy(true); try { const result = await call('campaign', { eventSlug, template, preview: true }); setCount(result.recipients); setMessage(`Получателей: ${result.recipients}`) } catch (e) { setMessage((e as Error).message) } finally { setBusy(false) } }}>Проверить получателей</Button><Button type="button" disabled={busy || !count} onClick={async () => { setBusy(true); try { const nextId = campaignId || crypto.randomUUID(); setCampaignId(nextId); const result = await call('campaign', { eventSlug, template, preview: false, campaignId: nextId, ...(runAt ? { runAt: new Date(runAt).toISOString() } : {}) }); setCount(null); setCampaignId(''); setMessage(`В очередь поставлено: ${result.queued}`) } catch (e) { setMessage((e as Error).message) } finally { setBusy(false) } }}>Запланировать отправку</Button></div><p role="status" className="text-sm">{message}</p></div>
}

export function ReferralWorkspace({ participants, total }: { participants: ParticipantRow[]; total: number }) {
  return <Tabs defaultValue="participants" className="flex flex-col gap-5"><TabsList><TabsTrigger value="participants">Участники · {total}</TabsTrigger><TabsTrigger value="settings">Настройки</TabsTrigger></TabsList><TabsContent value="participants" className="flex flex-col gap-5"><ParticipantsIndex rows={participants} /><Link href="/collections/automation-jobs" className="text-sm underline underline-offset-4">Очередь и журнал обработки</Link></TabsContent><TabsContent value="settings"><AutomationPanel section="referral" /></TabsContent></Tabs>
}
