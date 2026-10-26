'use client'

import { useAuth, useDocumentInfo } from '@payloadcms/ui'
import { LeadTypeSelect } from './LeadTypeSelect'
import { resolveLeadClassification } from '../../config/lead-classification'
import { Badge } from '../ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Field, FieldGroup, FieldLabel } from '../ui/field'
import { CodeBlock, CodeBlockActions, CodeBlockContent, CodeBlockCopyButton, CodeBlockHeader, CodeBlockTitle } from '../ui/code-block'

const statusLabel = { pending: 'Передача', test: 'Принято тестовым обработчиком', sent: 'Передано интеграции', failed: 'Ошибка передачи' }

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : ''
}

function record(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function formatDate(value: unknown) {
  if (typeof value !== 'string' || !value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Moscow' }).format(date)
}

export function LeadSubmissionDetails() {
  const { data } = useDocumentInfo()
  const { user } = useAuth()
  const payload = record(data?.payload)
  const meta = record(payload.meta)
  const status = text(data?.status)
  const rows = [
    ['Название сделки', text(data?.title) || text(payload.title)],
    ['Состояние', statusLabel[status as keyof typeof statusLabel] || status],
    ['Форма', text(data?.formId) || text(payload.formId)],
    ['Имя', text(payload.name)],
    ['Телефон', text(payload.phone)],
    ['Email', text(meta.email) || text(payload.email)],
    ['Сообщение', text(payload.message)],
    ['Страница', text(payload.sourceUrl)],
    ['Визит Roistat', text(meta.roistatVisit)],
    ['Идентификатор', text(data?.requestId)],
    ['Создано', formatDate(data?.createdAt)],
  ].filter(([, value]) => value)
  return <Card className="shadcn-surface shadow-none">
    <CardHeader>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <CardTitle>Заявка</CardTitle>
        {status && <Badge variant={status === 'failed' ? 'destructive' : 'outline'}>{statusLabel[status as keyof typeof statusLabel] || status}</Badge>}
      </div>
    </CardHeader>
    <CardContent>
      <FieldGroup className="gap-4">
        {data?.id && <Field><FieldLabel>Тип заявки</FieldLabel><LeadTypeSelect id={Number(data.id)} classification={resolveLeadClassification(data)} editable={['super-admin', 'admin'].includes(String(user?.role))} /></Field>}
        {rows.map(([label, value]) => <Field key={label}>
          <FieldLabel>{label}</FieldLabel>
          {label === 'Страница' && /^https?:\/\//.test(value) ? <a className="break-all text-sm underline-offset-4 hover:underline" href={value} target="_blank" rel="noreferrer">{value}</a> : <p className="whitespace-pre-wrap break-all text-sm">{value}</p>}
        </Field>)}
      </FieldGroup>
    </CardContent>
  </Card>
}

export function LeadSubmissionPayload() {
  const { data } = useDocumentInfo()
  let value = ''
  try { value = JSON.stringify(data?.payload ?? {}, null, 2) } catch { value = String(data?.payload ?? '') }
  return <div className="lead-submission-payload shadcn-surface">
    <CodeBlock className="h-full">
      <CodeBlockHeader>
        <CodeBlockTitle>Данные заявки</CodeBlockTitle>
        <CodeBlockActions><CodeBlockCopyButton value={value} /></CodeBlockActions>
      </CodeBlockHeader>
      <CodeBlockContent wrap lineNumbers>{value}</CodeBlockContent>
    </CodeBlock>
  </div>
}
