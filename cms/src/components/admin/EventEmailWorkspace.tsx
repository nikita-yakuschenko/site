'use client'

import { useDocumentInfo, useField } from '@payloadcms/ui'
import { EmailTemplateEditor } from './EmailTemplateEditor'
import { EventMailing } from './AutomationPanel'
import { Label } from '../ui/label'
import { Switch } from '../ui/switch'
import { Input } from '../ui/input'
function useEmail(path: string) {
  const subject = useField<string>({ path: `${path}.subject` }), html = useField<string>({ path: `${path}.html` }), text = useField<string>({ path: `${path}.text` })
  return { value: { subject: subject.value || '', html: html.value || '', text: text.value || '' }, onChange: (value: { subject?: string | null; html?: string | null; text?: string | null }) => { if (value.subject !== subject.value) subject.setValue(value.subject || ''); if (value.html !== html.value) html.setValue(value.html || ''); if (value.text !== text.value) text.setValue(value.text || '') }, disabled: html.disabled || html.formProcessing }
}
export function EventEmailWorkspace() {
  const confirmation = useEmail('confirmationEmail'), programme = useEmail('programmeEmail'), reminder = useEmail('reminderEmail')
  const enabled = useField<boolean>({ path: 'reminderEnabled' }), hours = useField<number>({ path: 'reminderHoursBefore' })
  const start = useField<string>({ path: 'startsAt' }), address = useField<string>({ path: 'address' }), phone = useField<string>({ path: 'phone' }), title = useField<string>({ path: 'title' })
  const { id, data } = useDocumentInfo()
  const when = start.value ? new Date(start.value) : null
  return <div className="event-email-workspace shadcn-surface grid items-start gap-6 xl:grid-cols-[minmax(240px,.7fr)_minmax(420px,1.3fr)]">
    <div className="flex min-w-0 flex-col gap-6"><div className="flex flex-col gap-4 rounded-lg border bg-card p-4"><h2 className="text-base font-semibold">Автоматическое напоминание</h2><div className="flex items-center justify-between gap-3"><Label htmlFor="event-reminder-enabled">Отправлять до мероприятия</Label><Switch id="event-reminder-enabled" disabled={enabled.disabled || enabled.formProcessing} checked={Boolean(enabled.value)} onCheckedChange={value => enabled.setValue(value)} /></div><div className="flex flex-col gap-2"><Label htmlFor="event-reminder-hours">За сколько часов</Label><Input id="event-reminder-hours" type="number" min={0} disabled={hours.disabled || hours.formProcessing} value={hours.value ?? 24} onChange={e => hours.setValue(Number(e.target.value))} /></div><p className="text-xs text-muted-foreground">Напоминание получают только подтвердившие регистрацию. Настройки отправителя и SMTP — в настройках CMS.</p></div><div className="rounded-lg border bg-card p-4">{id && data?.slug ? <EventMailing eventSlug={String(data.slug)} /> : <p className="text-sm text-muted-foreground">Сначала сохраните мероприятие, чтобы управлять рассылками.</p>}</div></div>
    <EmailTemplateEditor disabled={confirmation.disabled} templates={[{ key: 'confirmation', label: 'Подтверждение регистрации', ...confirmation }, { key: 'programme', label: 'Программа и календарь', ...programme }, { key: 'reminder', label: 'Напоминание', ...reminder }]} variables={{ event_title: title.value || 'День открытых дверей', event_date: when && Number.isFinite(when.getTime()) ? when.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', timeZone: 'Europe/Moscow' }) : '14 ноября', event_time: when && Number.isFinite(when.getTime()) ? when.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow' }) : '10:00', address: address.value || '', phone: phone.value || '', programme: (data?.programme || []).map((step: { time?: string; title?: string }) => [step.time, step.title].filter(Boolean).join(' — ')).join('\n') }} />
  </div>
}
