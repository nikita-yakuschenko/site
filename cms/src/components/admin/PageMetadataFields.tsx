'use client'

import { useDocumentInfo, useField } from '@payloadcms/ui'
import { Input } from '../ui/input'
import type { SelectFieldClientProps, TextFieldClientProps } from 'payload'
import { Badge } from '../ui/badge'
import { ChoiceSelect } from './ChoiceSelect'
import { DraftLeavePrompt } from './DraftLeavePrompt'
import { UnpublishedChanges } from './UnpublishedChanges'
import { IconInfoCircle, IconPencil } from '@tabler/icons-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Button } from '../ui/button'
import { projectSlugFromName } from '../../config/project-slug'
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuTrigger } from '../ui/dropdown-menu'

const kinds = { page: 'Страница', template: 'Шаблон', exposition: 'Выставочная площадка', redirect: 'Переадресация', preview: 'Предпросмотр' }

export function PageKindField({ path }: SelectFieldClientProps) {
  const { value, setValue } = useField<string>({ path: path || 'kind' })
  return <div className="shadcn-surface"><ChoiceSelect label="Тип страницы" value={value || 'page'} options={kinds} onChange={setValue} /></div>
}

// Source file and dates of the record
function RecordInfo() {
  const { data } = useDocumentInfo()
  return <DropdownMenu modal={false}><DropdownMenuTrigger asChild><Button type="button" variant="ghost" size="icon-sm" className="shrink-0" aria-label="Сведения о записи" title="Сведения о записи"><IconInfoCircle /></Button></DropdownMenuTrigger><DropdownMenuContent align="start" className="shadcn-surface w-72"><DropdownMenuLabel>Сведения о записи</DropdownMenuLabel><dl className="space-y-3 px-2 py-2 text-sm">
    {typeof data?.source === 'string' && <div><dt className="text-xs text-muted-foreground">Исходный файл</dt><dd className="mt-1 break-all">{data.source}</dd></div>}
    {typeof data?.exportName === 'string' && <div><dt className="text-xs text-muted-foreground">Экспорт компонента</dt><dd className="mt-1 break-all">{data.exportName}</dd></div>}
    {[['Последнее изменение', data?.updatedAt], ['Создано', data?.createdAt]].map(([label, date]) => typeof date === 'string' && <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 tabular-nums">{new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Moscow' }).format(new Date(date))}</dd></div>)}
  </dl></DropdownMenuContent></DropdownMenu>
}

type RecordFields = { name: string; type?: string; types?: Record<string, string>; typeLabel?: string; slug: string; slugLabel?: string; slugFrom: (name: string) => string; placeholder: string; follow?: string }

// Name, type and address in the single document controls row
function RecordMetadata({ fields, badge, children }: { fields: RecordFields; badge?: ReactNode; children?: ReactNode }) {
  const { id } = useDocumentInfo()
  const name = useField<string>({ path: fields.name })
  const type = useField<string>({ path: fields.type || fields.name })
  const slug = useField<string>({ path: fields.slug })
  const followed = useField<string>({ path: fields.follow ?? fields.name })
  const [editingSlug, setEditingSlug] = useState(false)
  const slugInput = useRef<HTMLInputElement>(null)
  // Focus the address input once edit mode enables it
  useEffect(() => { if (editingSlug) slugInput.current?.focus() }, [editingSlug])
  return <div className="shadcn-surface page-record-metadata project-record-metadata">
    <label className="project-record-name-wrap" aria-invalid={name.showError || undefined}>
    <Input className="project-record-name" autoFocus={!id} placeholder={fields.placeholder} aria-label="Название" aria-invalid={name.showError || undefined} title={name.showError ? name.errorMessage : undefined} value={name.value || ''} onChange={event => {
      const previous = name.value || ''
      // Address and dependent fields follow the name until edited manually
      if (!slug.value || slug.value === fields.slugFrom(previous)) slug.setValue(fields.slugFrom(event.target.value))
      if (fields.follow && (!followed.value || followed.value === previous)) followed.setValue(event.target.value)
      name.setValue(event.target.value)
    }} />
    {badge}
    </label>
    {fields.type && fields.types && <ChoiceSelect label={fields.typeLabel || ''} className="project-record-type" value={type.value || Object.keys(fields.types)[0]} options={fields.types} onChange={type.setValue} />}
    <div className="project-record-slug">
      <Input ref={slugInput} placeholder={fields.slugLabel || 'Адрес'} aria-label={fields.slugLabel || 'Адрес'} disabled={!editingSlug} aria-invalid={slug.showError || undefined} title={slug.showError ? slug.errorMessage : undefined} value={slug.value || ''} onChange={event => slug.setValue(event.target.value)} onBlur={() => setEditingSlug(false)} onKeyDown={event => event.key === 'Enter' && (event.preventDefault(), setEditingSlug(false))} />
      {!editingSlug && <Button type="button" variant="ghost" size="icon-sm" aria-label={`Редактировать: ${fields.slugLabel || 'адрес'}`} title={`Редактировать: ${fields.slugLabel || 'адрес'}`} onClick={() => setEditingSlug(true)}><IconPencil /></Button>}
    </div>
    {children}
  </div>
}

const pageFields: RecordFields = { name: 'title', type: 'kind', types: kinds, typeLabel: 'Тип страницы', slug: 'route', slugFrom: name => `/${projectSlugFromName(name)}`, placeholder: 'Введите название страницы', follow: 'metaTitle' }

export function PageRecordMetadata() {
  const { id, hasPublishedDoc } = useDocumentInfo()
  const metaTitle = useField<string>({ path: 'metaTitle' })
  return <RecordMetadata fields={pageFields} badge={<Badge variant={hasPublishedDoc ? 'default' : 'outline'}>{hasPublishedDoc ? 'Опубликована' : 'Черновик'}</Badge>}>
    <Input className="project-record-title" placeholder="Title" aria-label="Заголовок вкладки (Title)" title="Заголовок вкладки (Title)" aria-invalid={metaTitle.showError || undefined} value={metaTitle.value || ''} onChange={event => metaTitle.setValue(event.target.value)} />
    <RecordInfo />
    {!id && <DraftLeavePrompt nameField="title" />}
    <UnpublishedChanges />
  </RecordMetadata>
}

const blockFields: RecordFields = { name: 'title', slug: 'key', slugLabel: 'Ключ', slugFrom: () => '', placeholder: 'Название блока' }

export function BlockRecordMetadata() {
  return <RecordMetadata fields={blockFields}><RecordInfo /></RecordMetadata>
}

const recordTypes = { project: 'Проект дома', 'ready-home': 'Готовый дом' }
const projectFields: RecordFields = { name: 'name', type: 'recordType', types: recordTypes, typeLabel: 'Тип записи', slug: 'slug', slugFrom: projectSlugFromName, placeholder: 'Введите название проекта' }

export function ProjectRecordMetadata() {
  const { id, hasPublishedDoc } = useDocumentInfo()
  return <RecordMetadata fields={projectFields} badge={<Badge variant={hasPublishedDoc ? 'default' : 'outline'}>{hasPublishedDoc ? 'Опубликован' : 'Черновик'}</Badge>}>
    {!id && <DraftLeavePrompt />}
    <UnpublishedChanges />
  </RecordMetadata>
}

export function PageSourceField({ path }: TextFieldClientProps) {
  const { value } = useField<string>({ path: path || 'source' })
  if (!value) return null
  return <div className="shadcn-surface page-metadata-field"><span className="page-metadata-field__label">Исходный файл</span><span className="break-all text-xs text-muted-foreground">{value}</span></div>
}
