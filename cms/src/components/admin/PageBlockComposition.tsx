'use client'
import { useCollapsible, useField, useFormFields, useRowLabel } from '@payloadcms/ui'
import { useEffect, useState } from 'react'
import type { TextareaFieldClientProps, UIFieldClientProps, UploadFieldClientProps } from 'payload'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'
import { Input } from '../ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Attachment, AttachmentAction, AttachmentActions, AttachmentContent, AttachmentDescription, AttachmentMedia, AttachmentTitle, AttachmentTrigger } from '../ui/attachment'
import { IconComponents, IconForms, IconPencil, IconSearch, IconX } from '@tabler/icons-react'
import { mediaDocumentId } from './media-id'
import { ProjectImageUpload } from './ProjectImageUpload'
import { projectBlockParts } from '../../config/project-block-parts'
import { configurationKeys, configurationNames } from '../../../../src/lib/catalog/configuration-rules'

// The card header already names the part. Inside, the person edits the words the site shows.
const partFields: Record<string, { name: 'text' | 'textMore' | 'href'; label: string; rows?: number; bare?: boolean }[]> = {
  'hero.heading': [{ name: 'text', label: 'Первая строка', rows: 2 }, { name: 'textMore', label: 'Вторая строка', rows: 2 }],
  'hero.subtitle': [{ name: 'text', label: 'Текст', rows: 3 }],
  'hero.button': [{ name: 'text', label: 'Надпись', rows: 2 }, { name: 'href', label: 'Ссылка' }],
  'popularProjects.heading': [{ name: 'text', label: 'Заголовок', bare: true }],
  'popularProjects.button': [{ name: 'text', label: 'Текст кнопки', bare: true }],
  'seriesBento.heading': [{ name: 'text', label: 'Заголовок', bare: true }],
  'seriesBento.button': [{ name: 'text', label: 'Текст кнопки', bare: true }],
  'openDay.date': [{ name: 'text', label: 'Дата, например «12 декабря»' }],
}

const seriesOptions = [
  { value: 'panel', label: 'Панельно-каркасные дома' },
  { value: 'barn', label: 'Барнхаусы' },
  { value: 'classic', label: 'Классика' },
  { value: 'modular', label: 'Модульные дома' },
]

function partTitle(key?: string, title?: string) {
  if (key === 'hero.background') return 'Фоновое изображение'
  if (key === 'popularProjects.button' || key === 'seriesBento.button') return 'Текст кнопки'
  return title
}

export function HiddenPartField() {
  return null
}

function mediaId(value: unknown) {
  return mediaDocumentId(value) || ''
}

type FormOption = { id: string; title: string; key: string }
let formOptionsRequest: Promise<FormOption[]> | null = null
function formOptions() {
  formOptionsRequest ??= fetch('/api/forms?limit=50&depth=0&sort=title', { credentials: 'include' }).then(response => response.ok ? response.json() : { docs: [] }).then(data => (Array.isArray(data.docs) ? data.docs : []).flatMap((doc: { id?: unknown; title?: unknown; key?: unknown }) => {
    const id = mediaId(doc.id)
    const title = typeof doc.title === 'string' && doc.title ? doc.title : ''
    if (!id || !title) return []
    return [{ id, title, key: typeof doc.key === 'string' ? doc.key : '' }]
  })).catch(() => [])
  return formOptionsRequest
}

function HeroPromoFields({ row, partKey }: { row: string; partKey: string }) {
  const title = useField<string>({ path: `${row}.title` })
  const eyebrow = useField<string>({ path: `${row}.textMore` })
  const text = useField<string>({ path: `${row}.text` })
  const cta = useField<string>({ path: `${row}.href` })
  const action = useField<string>({ path: `${row}.action` })
  const link = useField<string>({ path: `${row}.link` })
  const form = useField<number | string | null>({ path: `${row}.form` })
  const image = useField<string | null>({ path: `${row}.image` })
  const [imageUrl, setImageUrl] = useState('')
  const [forms, setForms] = useState<FormOption[]>([])
  const [formKey, setFormKey] = useState('')
  const actionValue = action.value === 'link' ? 'link' : 'form'
  const formId = mediaId(form.value)
  useEffect(() => {
    let cancelled = false
    const id = mediaId(image.value)
    if (!id) { setImageUrl(''); return }
    fetch(`/api/media/${id}?depth=0`, { credentials: 'include' }).then(response => response.ok ? response.json() : null).then(doc => {
      const url = typeof doc?.url === 'string' ? doc.url : ''
      if (!cancelled) setImageUrl(url ? new URL(url, window.location.origin).href : '')
    })
    return () => { cancelled = true }
  }, [image.value])
  useEffect(() => { let cancelled = false; formOptions().then(items => { if (!cancelled) setForms(items) }); return () => { cancelled = true } }, [])
  useEffect(() => {
    const chosen = forms.find(item => item.id === formId)
    setFormKey(chosen?.key || '')
  }, [forms, formId])
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('avgst:part-draft', { detail: { key: partKey, title: title.value || '', textMore: eyebrow.value || '', text: text.value || '', href: cta.value || '', image: imageUrl, action: actionValue, url: link.value || '', formKey } }))
  }, [partKey, title.value, eyebrow.value, text.value, cta.value, imageUrl, actionValue, link.value, formKey])
  return <div className="promo-fields">
    <ProjectImageUpload path={`${row}.image`} field={{ name: 'image', label: 'Изображение', type: 'upload', relationTo: 'media' } as UploadFieldClientProps['field']} />
    <div className="field-type text"><label className="field-label" htmlFor={`${row}-eyebrow`}>Надстрочник</label><input id={`${row}-eyebrow`} type="text" value={eyebrow.value || ''} onChange={event => eyebrow.setValue(event.target.value)} /></div>
    <div className="field-type text"><label className="field-label" htmlFor={`${row}-title`}>Заголовок</label><input id={`${row}-title`} type="text" value={title.value || ''} onChange={event => title.setValue(event.target.value)} /></div>
    <div className="field-type textarea"><label className="field-label" htmlFor={`${row}-text`}>Текст</label><textarea id={`${row}-text`} rows={2} value={text.value || ''} onChange={event => text.setValue(event.target.value)} /></div>
    <div className="field-type text"><label className="field-label" htmlFor={`${row}-cta`}>Кнопка</label><input id={`${row}-cta`} type="text" value={cta.value || ''} onChange={event => cta.setValue(event.target.value)} /></div>
    <div className="field-type select"><label className="field-label" htmlFor={`${row}-action`}>Действие</label><Select value={actionValue} onValueChange={action.setValue}><SelectTrigger id={`${row}-action`} className="w-full"><SelectValue /></SelectTrigger><SelectContent position="popper"><SelectItem value="link">Переход по ссылке</SelectItem><SelectItem value="form">Открытие формы</SelectItem></SelectContent></Select></div>
    {actionValue === 'link'
      ? <PageLinkField path={`${row}.link`} />
      : <FormField path={`${row}.form`} heading={title.value || ''} body={text.value || ''} submit={cta.value || ''} />}
  </div>
}

function PromoSlot({ row, partKey }: { row: string; partKey: string }) {
  const title = useFormFields(([fields]) => String(fields[`${row}.title`]?.value || ''))
  const [open, setOpen] = useState(false)
  return <div className="promo-slot" data-open={open ? '' : undefined}>
    <button type="button" className="promo-slot__toggle" aria-expanded={open} onClick={() => setOpen(value => { const next = !value; window.dispatchEvent(new CustomEvent('avgst:preview-selection', { detail: next ? { path: row, key: partKey, title: title || partKey } : { path: row, closed: true } })); return next })}>{title || 'Слот'}</button>
    {open ? <div className="promo-slot__body" onFocusCapture={() => window.dispatchEvent(new CustomEvent('avgst:preview-selection', { detail: { path: row, key: partKey, title: title || partKey } }))}><HeroPromoFields row={row} partKey={partKey} /></div> : null}
  </div>
}

function HeroPromoSlots() {
  const slots = useFormFields(([fields]) => {
    const count = Array.isArray((fields.parts as { rows?: unknown[] } | undefined)?.rows) ? (fields.parts as { rows: unknown[] }).rows.length : 0
    const found = []
    for (let index = 0; index < count; index++) {
      const key = String(fields[`parts.${index}.key`]?.value || '')
      if (/^hero\.promo\.\d+$/.test(key)) found.push({ index, key })
    }
    return JSON.stringify(found)
  })
  const rows = JSON.parse(slots) as { index: number; key: string }[]
  return <div className="promo-slots">{rows.map(slot => <PromoSlot key={slot.key} row={`parts.${slot.index}`} partKey={slot.key} />)}</div>
}

type PageOption = { id: string; title: string; route: string; kind: string }
const pageKindLabel: Record<string, string> = { page: 'Страница', exposition: 'Выставочная площадка', redirect: 'Переадресация' }
let pageOptionsRequest: Promise<PageOption[]> | null = null
function pageOptions() {
  pageOptionsRequest ??= fetch('/api/pages?limit=300&depth=0&sort=title&where[_status][equals]=published', { credentials: 'include' }).then(response => response.ok ? response.json() : { docs: [] }).then(data => (Array.isArray(data.docs) ? data.docs : []).flatMap((doc: { id?: unknown; title?: unknown; route?: unknown; kind?: unknown }) => {
    const id = mediaId(doc.id)
    const title = typeof doc.title === 'string' ? doc.title : ''
    const route = typeof doc.route === 'string' ? doc.route : ''
    const kind = typeof doc.kind === 'string' ? doc.kind : ''
    if (!id || !title || !route.startsWith('/') || route.includes('[') || kind === 'template' || kind === 'preview') return []
    return [{ id, title, route, kind }]
  })).catch(() => [])
  return pageOptionsRequest
}

function PageLinkField({ path }: { path: string }) {
  const link = useField<string>({ path })
  const [pages, setPages] = useState<PageOption[]>([])
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  useEffect(() => { let cancelled = false; pageOptions().then(items => { if (!cancelled) setPages(items) }); return () => { cancelled = true } }, [])
  const chosen = pages.find(item => item.route === link.value)
  const query = search.trim().toLocaleLowerCase('ru')
  const matches = pages.filter(item => `${item.title} ${item.route}`.toLocaleLowerCase('ru').includes(query))
  const pick = (item: PageOption) => { link.setValue(item.route); setOpen(false); setSearch('') }
  return <>
    <Attachment state={chosen || link.value ? 'done' : 'idle'} className="w-full">
      <AttachmentMedia variant="icon"><IconSearch /></AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle>{chosen?.title || link.value || 'Выберите страницу'}</AttachmentTitle>
        <AttachmentDescription>{chosen ? `${pageKindLabel[chosen.kind] || 'Страница'} · ${chosen.route}` : 'Страница сайта'}</AttachmentDescription>
      </AttachmentContent>
      {link.value ? <AttachmentActions><AttachmentAction type="button" aria-label="Убрать страницу" onClick={() => link.setValue('')}><IconX /></AttachmentAction></AttachmentActions> : null}
      <AttachmentTrigger aria-label={chosen ? `Заменить ${chosen.title}` : 'Выберите страницу'} onClick={() => setOpen(true)} />
    </Attachment>
    <Dialog open={open} onOpenChange={next => { setOpen(next); if (!next) setSearch('') }}>
      <DialogContent className="shadcn-surface">
        <DialogHeader>
          <DialogTitle>Страница сайта</DialogTitle>
          <DialogDescription>Найдите страницу и выберите её для этой кнопки.</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <IconSearch className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="Поиск страницы" placeholder="Поиск страницы" className="pl-9" value={search} onChange={event => setSearch(event.target.value)} />
        </div>
        <div className="h-80 overflow-auto">{matches.map(item => <button key={item.id} type="button" className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-muted" onClick={() => pick(item)}>
          <span className="min-w-0"><span className="block truncate text-sm font-medium">{item.title}</span><span className="block truncate text-xs text-muted-foreground">{item.route}</span></span>
        </button>)}{matches.length === 0 ? <p className="px-2 py-6 text-center text-sm text-muted-foreground">Ничего не найдено</p> : null}</div>
      </DialogContent>
    </Dialog>
  </>
}

function FormField({ path, heading, body, submit }: { path: string; heading: string; body: string; submit: string }) {
  const form = useField<number | string | null>({ path })
  const [forms, setForms] = useState<FormOption[]>([])
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [pinned, setPinned] = useState<FormOption | null>(null)
  useEffect(() => { let cancelled = false; formOptions().then(items => { if (!cancelled) setForms(items) }); return () => { cancelled = true } }, [])
  const formId = mediaId(form.value)
  const chosen = forms.find(item => item.id === formId)
  const query = search.trim().toLocaleLowerCase('ru')
  const matches = forms.filter(item => `${item.title} ${item.key}`.toLocaleLowerCase('ru').includes(query))
  const shown = pinned || chosen
  const close = () => { setOpen(false); setSearch(''); setPinned(null) }
  const confirm = () => { if (!pinned) return; form.setValue(pinned.id); close() }
  return <>
    <Attachment state={chosen ? 'done' : 'idle'} className="w-full">
      <AttachmentMedia variant="icon"><IconForms /></AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle>{chosen?.title || 'Выберите форму'}</AttachmentTitle>
        <AttachmentDescription>{chosen?.key || 'Откроется по кнопке'}</AttachmentDescription>
      </AttachmentContent>
      {chosen ? <AttachmentActions><AttachmentAction type="button" aria-label="Убрать форму" onClick={() => form.setValue(null)}><IconX /></AttachmentAction></AttachmentActions> : null}
      <AttachmentTrigger aria-label={chosen ? `Заменить ${chosen.title}` : 'Выберите форму'} onClick={() => setOpen(true)} />
    </Attachment>
    <Dialog open={open} onOpenChange={next => { if (next) setOpen(true); else close() }}>
      <DialogContent className="shadcn-surface sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Форма</DialogTitle>
          <DialogDescription>Нажмите форму, чтобы закрепить её в превью, затем подтвердите.</DialogDescription>
        </DialogHeader>
        <div className="grid items-start gap-4 sm:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="flex min-w-0 flex-col gap-4">
            <div className="relative">
              <IconSearch className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input aria-label="Поиск формы" placeholder="Поиск формы" className="pl-9" value={search} onChange={event => setSearch(event.target.value)} />
            </div>
            <div className="min-h-80">{matches.map(item => <button key={item.id} type="button" className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-muted ${item.id === shown?.id ? 'bg-muted' : ''}`} onClick={() => setPinned(item)}>
              <span className="min-w-0"><span className="block truncate text-sm font-medium">{item.title}</span>{item.key ? <span className="block truncate text-xs text-muted-foreground">{item.key}</span> : null}</span>
            </button>)}{matches.length === 0 ? <p className="px-2 py-6 text-center text-sm text-muted-foreground">Ничего не найдено</p> : null}</div>
          </div>
          <div className="flex flex-col gap-3">
            <FormPreview name={shown?.title || ''} formKey={shown?.key || ''} heading={heading} body={body} submit={submit} />
            <Button type="button" className={`w-full ${pinned ? '' : 'invisible'}`} disabled={!pinned} tabIndex={pinned ? 0 : -1} onClick={confirm}>Подтвердить</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </>
}

function FormPreview({ name, formKey, heading, body, submit }: { name: string; formKey: string; heading: string; body: string; submit: string }) {
  const field = 'mt-1 h-8 rounded-md border border-neutral-200 bg-neutral-50'
  return <div className="rounded-xl bg-neutral-900 p-3">
    <p className="mb-2 truncate text-xs text-white/70">{name ? (formKey ? `${name} · ${formKey}` : name) : 'Выберите форму слева'}</p>
    <div className="rounded-2xl bg-white p-4 text-neutral-900">
      <p className="pr-6 text-sm font-semibold">{heading || 'Задать вопрос'}</p>
      {body ? <p className="mt-1 text-xs leading-snug text-neutral-500">{body}</p> : null}
      <p className="mt-3 text-xs font-medium">Имя</p><div className={field} />
      <p className="mt-2 text-xs font-medium">Телефон</p><div className={`${field} px-2 text-xs leading-8 text-neutral-400`}>+7</div>
      <p className="mt-3 flex items-start gap-2 text-[11px] leading-snug text-neutral-500"><span className="mt-0.5 size-3 shrink-0 rounded-sm bg-neutral-900" aria-hidden="true" />Согласен на обработку персональных данных</p>
      <div className="mt-3 flex h-9 items-center justify-center rounded-md bg-[#fcc90c] text-sm font-semibold">{submit || 'Задать вопрос'}</div>
    </div>
  </div>
}

type CatalogOption = { id: string; name: string; area: string; badge: string; image: string }
let catalogOptionsRequest: Promise<CatalogOption[]> | null = null
function catalogOptions() {
  catalogOptionsRequest ??= fetch('/api/projects?limit=300&depth=1&sort=name&where[_status][equals]=published', { credentials: 'include' }).then(response => response.ok ? response.json() : { docs: [] }).then(data => (Array.isArray(data.docs) ? data.docs : []).flatMap((doc: { id?: string; name?: string; areaValue?: number | null; technologyBadge?: string | null; desktopImage?: { url?: string | null } | string | null }) => {
    const id = String(doc.id || '')
    const name = String(doc.name || '')
    if (!id || !name) return []
    const photo = doc.desktopImage && typeof doc.desktopImage === 'object' ? doc.desktopImage.url : ''
    return [{ id, name, area: doc.areaValue ? `${doc.areaValue} м²` : '', badge: doc.technologyBadge || '', image: photo ? new URL(photo, window.location.origin).href : '' }]
  })).catch(() => [])
  return catalogOptionsRequest
}

function ProjectAttachment({ row, catalog }: { row: string; catalog: CatalogOption[] }) {
  const value = useField<string>({ path: `${row}.href` })
  const title = useField<string>({ path: `${row}.title` })
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const chosen = catalog.find(item => item.id === value.value)
  const query = search.trim().toLocaleLowerCase('ru')
  const matches = catalog.filter(item => `${item.name} ${item.badge}`.toLocaleLowerCase('ru').includes(query))
  const summary = [chosen?.area, chosen?.badge].filter(Boolean).join(' · ')
  const pick = (item: CatalogOption) => { value.setValue(item.id); title.setValue(item.name); setOpen(false); setSearch('') }
  return <>
    <Attachment state={chosen ? 'done' : 'idle'} className="w-full">
      <AttachmentMedia variant={chosen?.image ? 'image' : 'icon'}>{chosen?.image ? <img src={chosen.image} alt="" /> : <IconSearch />}</AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle>{chosen?.name || 'Выберите проект'}</AttachmentTitle>
        <AttachmentDescription>{chosen ? summary || 'Проект каталога' : 'Из каталога'}</AttachmentDescription>
      </AttachmentContent>
      {chosen ? <AttachmentActions><AttachmentAction type="button" aria-label={`Убрать ${chosen.name}`} onClick={() => { value.setValue(''); title.setValue('') }}><IconX /></AttachmentAction></AttachmentActions> : null}
      <AttachmentTrigger aria-label={chosen ? `Заменить ${chosen.name}` : 'Выберите проект'} onClick={() => setOpen(true)} />
    </Attachment>
    <Dialog open={open} onOpenChange={next => { setOpen(next); if (!next) setSearch('') }}>
      <DialogContent className="shadcn-surface">
        <DialogHeader>
          <DialogTitle>Проект из каталога</DialogTitle>
          <DialogDescription>Найдите проект и выберите его для этого места.</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <IconSearch className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="Поиск проекта" placeholder="Поиск проекта" className="pl-9" value={search} onChange={event => setSearch(event.target.value)} />
        </div>
        <div className="max-h-80 overflow-auto">{matches.map(item => <button key={item.id} type="button" className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-muted" onClick={() => pick(item)}>
          {item.image ? <img className="size-10 rounded-lg object-cover" src={item.image} alt="" /> : <span className="size-10 rounded-lg bg-muted" />}
          <span className="min-w-0"><span className="block truncate text-sm font-medium">{item.name}</span><span className="block truncate text-xs text-muted-foreground">{[item.area, item.badge].filter(Boolean).join(' · ')}</span></span>
        </button>)}{matches.length === 0 ? <p className="px-2 py-6 text-center text-sm text-muted-foreground">Ничего не найдено</p> : null}</div>
      </DialogContent>
    </Dialog>
  </>
}

function PopularProjectCards() {
  const [catalog, setCatalog] = useState<CatalogOption[]>([])
  const slots = useFormFields(([fields]) => {
    const count = Array.isArray((fields.parts as { rows?: unknown[] } | undefined)?.rows) ? (fields.parts as { rows: unknown[] }).rows.length : 0
    const found = []
    for (let index = 0; index < count; index++) {
      const key = String(fields[`parts.${index}.key`]?.value || '')
      if (/^popularProjects\.slot\.\d+$/.test(key)) found.push({ index, key })
    }
    return JSON.stringify(found)
  })
  useEffect(() => { let cancelled = false; catalogOptions().then(items => { if (!cancelled) setCatalog(items) }); return () => { cancelled = true } }, [])
  const rows = JSON.parse(slots) as { index: number; key: string }[]
  return <div className="attachment-list project-slots">{rows.map(slot => <ProjectAttachment key={slot.key} row={`parts.${slot.index}`} catalog={catalog} />)}</div>
}

function SeriesSlot({ row }: { row: string }) {
  const name = useField<string>({ path: `${row}.text` })
  const series = useField<string>({ path: `${row}.href` })
  return <div className="series-slot">
    <ProjectImageUpload path={`${row}.image`} field={{ name: 'image', label: 'Превью', type: 'upload', relationTo: 'media' } as UploadFieldClientProps['field']} />
    <div className="field-type text"><label className="field-label" htmlFor={`${row}-name`}>Название</label><input id={`${row}-name`} type="text" value={name.value || ''} onChange={event => name.setValue(event.target.value)} /></div>
    <div className="field-type select"><label className="field-label" htmlFor={`${row}-series`}>Серия</label><Select value={seriesOptions.some(option => option.value === series.value) ? series.value : undefined} onValueChange={series.setValue}><SelectTrigger id={`${row}-series`} className="w-full"><SelectValue placeholder="Серия" /></SelectTrigger><SelectContent position="popper">{seriesOptions.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></div>
  </div>
}

function SeriesSlots() {
  const slots = useFormFields(([fields]) => {
    const count = Array.isArray((fields.parts as { rows?: unknown[] } | undefined)?.rows) ? (fields.parts as { rows: unknown[] }).rows.length : 0
    const found = []
    for (let index = 0; index < count; index++) {
      const key = String(fields[`parts.${index}.key`]?.value || '')
      if (/^seriesBento\.slot\.\d+$/.test(key)) found.push({ index, key })
    }
    return JSON.stringify(found)
  })
  const rows = JSON.parse(slots) as { index: number; key: string }[]
  return <div className="series-slots">{rows.map(slot => <SeriesSlot key={slot.key} row={`parts.${slot.index}`} />)}</div>
}

function HeroBackgroundFields({ row }: { row: string }) {
  const image = useField<string | null>({ path: `${row}.image` })
  const mobile = useField<string | null>({ path: `${row}.imageMobile` })
  const [urls, setUrls] = useState({ image: '', imageMobile: '' })
  useEffect(() => {
    let cancelled = false
    const load = async (id: string) => {
      if (!id) return ''
      const response = await fetch(`/api/media/${id}?depth=0`, { credentials: 'include' })
      const doc = response.ok ? await response.json() : null
      const url = typeof doc?.url === 'string' ? doc.url : ''
      return url ? new URL(url, window.location.origin).href : ''
    }
    Promise.all([load(mediaId(image.value)), load(mediaId(mobile.value))]).then(([desktop, phone]) => { if (!cancelled) setUrls({ image: desktop, imageMobile: phone }) })
    return () => { cancelled = true }
  }, [image.value, mobile.value])
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('avgst:part-draft', { detail: { key: 'hero.background', image: urls.image, imageMobile: urls.imageMobile } }))
  }, [urls])
  const upload = (name: 'image' | 'imageMobile', label: string) => <ProjectImageUpload path={`${row}.${name}`} field={{ name, label, type: 'upload', relationTo: 'media' } as UploadFieldClientProps['field']} />
  return <div className="background-fields">
    {upload('image', 'Десктопная версия')}
    {upload('imageMobile', 'Мобильная версия')}
  </div>
}

function PersonPartFields({ row, partKey }: { row: string; partKey: string }) {
  const name = useField<string>({ path: `${row}.text` })
  const caption = useField<string>({ path: `${row}.textMore` })
  const image = useField<string | null>({ path: `${row}.image` })
  const [imageUrl, setImageUrl] = useState('')
  useEffect(() => {
    let cancelled = false
    const id = mediaId(image.value)
    if (!id) { setImageUrl(''); return }
    fetch(`/api/media/${id}?depth=0`, { credentials: 'include' }).then(response => response.ok ? response.json() : null).then(doc => {
      const url = typeof doc?.url === 'string' ? doc.url : ''
      if (!cancelled) setImageUrl(url ? new URL(url, window.location.origin).href : '')
    })
    return () => { cancelled = true }
  }, [image.value])
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('avgst:part-draft', { detail: { key: partKey, text: name.value || '', textMore: caption.value || '', image: imageUrl } }))
  }, [partKey, name.value, caption.value, imageUrl])
  return <div className="flex flex-col gap-4">
    <ProjectImageUpload path={`${row}.image`} field={{ name: 'image', label: 'Фото', type: 'upload', relationTo: 'media' } as UploadFieldClientProps['field']} />
    <div className="field-type text"><label className="field-label" htmlFor={`${row}-person-name`}>Имя и фамилия</label><input id={`${row}-person-name`} type="text" value={name.value || ''} onChange={event => name.setValue(event.target.value)} /></div>
    <div className="field-type text"><label className="field-label" htmlFor={`${row}-person-caption`}>Подпись</label><input id={`${row}-person-caption`} type="text" value={caption.value || ''} onChange={event => caption.setValue(event.target.value)} /></div>
  </div>
}

export function PartContentFields({ path }: TextareaFieldClientProps) {
  const row = path.replace(/\.text$/, '')
  const key = useFormFields(([fields]) => String(fields[`${row}.key`]?.value || ''))
  const text = useField<string>({ path })
  const more = useField<string>({ path: `${row}.textMore` })
  const link = useField<string>({ path: `${row}.href` })
  const bound = { text, textMore: more, href: link }
  const fields = partFields[key]
  const galleryPaths = useFormFields(([formFields]) => {
    const group = /^(.*(?:\.prop\.images|\.content\.gallery))\.\d+\.image$/.exec(key)?.[1]
    if (!group) return ''
    const count = (formFields.parts as { rows?: unknown[] } | undefined)?.rows?.length || 0
    const paths = []
    for (let index = 0; index < count; index++) if (String(formFields[`parts.${index}.key`]?.value || '').startsWith(`${group}.`)) paths.push(`parts.${index}.image`)
    return JSON.stringify(paths.slice(Math.max(0, paths.indexOf(`${row}.image`))))
  })
  useEffect(() => {
    if (!fields) return
    window.dispatchEvent(new CustomEvent('avgst:part-draft', { detail: { key, text: text.value || '', textMore: more.value || '', href: link.value || '' } }))
  }, [fields, key, text.value, more.value, link.value])
  if (key === 'hero.background') return <HeroBackgroundFields row={row} />
  if (/^popularProjects\.slot\.\d+$/.test(key) || key === 'popularProjects.cards') return key === 'popularProjects.cards' ? <PopularProjectCards /> : null
  if (/^seriesBento\.slot\.\d+$/.test(key) || key === 'seriesBento.cards') return key === 'seriesBento.cards' ? <SeriesSlots /> : null
  if (/^hero\.promo\.\d+$/.test(key)) return null
  if (key === 'hero.promos') return <HeroPromoSlots />
  if (key.endsWith('.person')) return <PersonPartFields row={row} partKey={key} />
  if (key.includes('.content.')) return <div className="flex flex-col gap-4">
    {key.endsWith('.image') ? <>
      <ProjectImageUpload path={`${row}.image`} fallbackImageUrl={more.value || ''} batchPaths={galleryPaths ? JSON.parse(galleryPaths) as string[] : undefined} galleryPrefix={/^(.*\.content\.gallery)\.\d+\.image$/.exec(key)?.[1]} field={{ name: 'image', label: 'Изображение', type: 'upload', relationTo: 'media' } as UploadFieldClientProps['field']} />
    </> : key.endsWith('.href') ? <Input aria-label="Ссылка" value={link.value || ''} onChange={event => link.setValue(event.target.value)} /> : <textarea aria-label="Текст" className="w-full" rows={3} value={text.value || ''} onChange={event => text.setValue(event.target.value)} />}
  </div>
  if (!fields) return <p className="text-sm text-muted-foreground">Содержимое этой части пока задаётся в коде сайта.</p>
  return <div className="flex flex-col gap-4">{fields.map(field => <div key={field.name} className={`field-type ${field.name === 'href' || !field.rows ? 'text' : 'textarea'}`}>
    {field.bare ? null : <label className="field-label" htmlFor={`${row}-${field.name}`}>{field.label}</label>}
    {field.name === 'href' || !field.rows
      ? <input id={`${row}-${field.name}`} type="text" aria-label={field.label} value={bound[field.name].value || ''} onChange={event => bound[field.name].setValue(event.target.value)} />
      : <textarea id={`${row}-${field.name}`} rows={field.rows} aria-label={field.label} value={bound[field.name].value || ''} onChange={event => bound[field.name].setValue(event.target.value)} />}
  </div>)}</div>
}

// Scrolls the block editor to the part named in the #part-key link

export function BlockPartFocus() {
  useEffect(() => {
    if (!window.location.hash.startsWith('#part-')) return
    const key = decodeURIComponent(window.location.hash.slice('#part-'.length))
    // Fields render after the form loads, so poll briefly for the row
    let tries = 0
    const timer = setInterval(() => {
      const row = document.querySelector(`[data-part-key="${CSS.escape(key)}"]`)?.closest('.array-field__row')
      if (row || ++tries > 25) clearInterval(timer)
      if (!row) return
      row.setAttribute('data-part-focus', '')
      row.scrollIntoView({ block: 'center' })
    }, 200)
    return () => clearInterval(timer)
  }, [])
  return null
}

export function BlockPartLabel() {
  const { data, path } = useRowLabel<{ title?: string; key?: string }>()
  const { isCollapsed } = useCollapsible()
  useEffect(() => {
    if (!data?.key) return
    const title = partTitle(data.key, data.title) || data.key
    window.dispatchEvent(new CustomEvent('avgst:preview-selection', { detail: isCollapsed ? { path, closed: true } : { path, key: data.key, title } }))
  }, [isCollapsed, data?.key, data?.title, path])
  const title = partTitle(data?.key, data?.title)
  return <span data-part-key={data?.key || undefined} data-row-path={path} className="truncate text-sm font-medium">{title || 'Новая часть'}</span>
}

export function PageBlockComposition({ path }: UIFieldClientProps) {
  const parent = (path || '').replace(/\.composition$/, '')
  const component = useFormFields(([fields]) => fields[`${parent}.component`]?.value) as { relationTo: string; value: string | { id: string } } | undefined
  const id = typeof component?.value === 'object' ? component.value.id : component?.value
  const recordKey = `${component?.relationTo}:${id}`
  const [record, setRecord] = useState<{ recordKey: string; structureOnly: boolean; editURL?: string; parts: { key: string; title: string }[] }>()
  useEffect(() => {
    if (!id || !['blocks', 'forms'].includes(component?.relationTo || '')) return
    const controller = new AbortController()
    fetch(`/api/${component?.relationTo}/${id}?depth=0`, { signal: controller.signal }).then(response => response.ok ? response.json() : null).then(async data => {
      if (!data) return
      const projectBlock = projectBlockParts[data.key]
      let editURL: string | undefined
      if (projectBlock) {
        const type = data.key === 'ReadyHomeOffer' ? 'ready-home' : 'project'
        const response = await fetch(`/api/projects?limit=1&depth=0&sort=name&where[_status][equals]=published&where[recordType][equals]=${type}`, { signal: controller.signal })
        const project = response.ok ? (await response.json()).docs?.[0] : null
        if (project) editURL = `/collections/projects/${project.id}#block-${projectBlock.section}`
      }
      const configurationParts = data.key === 'ProjectConfig' ? [false, true].flatMap(modular => configurationKeys(modular).map(key => ({ key: `ProjectConfig.${modular ? 'modular' : 'panel'}.${key}`, title: `${modular ? 'Модульные' : 'Панельно-каркасные'}: ${configurationNames[key]}` }))) : null
      setRecord({ recordKey, structureOnly: data.defaults?.structureOnly === true, editURL, parts: projectBlock?.parts || configurationParts || data.parts || [] })
    }).catch(() => {})
    return () => controller.abort()
  }, [id, component?.relationTo, recordKey])
  if (record?.recordKey !== recordKey) return null
  if (record.structureOnly) return <p className="text-sm text-muted-foreground">Секвенции производства. Содержимое пока не привязано к редактору.</p>
  const editURL = record.editURL || `/collections/${component?.relationTo}/${id}`
  const slotsOf = (key: string) => key === 'hero.promos' ? record.parts.filter(part => /^hero\.promo\.\d+$/.test(part.key)) : key === 'seriesBento.cards' ? record.parts.filter(part => /^seriesBento\.slot\.\d+$/.test(part.key)) : []
  const parts = record.parts.filter(part => !/^hero\.promo\.\d+$/.test(part.key) && !/^seriesBento\.slot\.\d+$/.test(part.key))
  return <div className="shadcn-surface mb-4">
    <div className="mb-2 flex items-start justify-between gap-2">
      <div><p className="text-sm font-medium">Состав блока</p>{record.parts.length > 0 && <p className="text-xs text-muted-foreground">Нажмите на часть, чтобы показать её в превью</p>}</div>
      <Button size="sm" variant="outline" asChild><a href={editURL}><IconPencil />{component?.relationTo === 'forms' ? 'Редактировать форму' : 'Редактировать блок'}</a></Button>
    </div>
    <div className="flex flex-col gap-1">{parts.map(part => <div key={part.key}>
      <div className="group flex items-center gap-1">
        <Button type="button" variant="ghost" className="flex-1 justify-start" onClick={() => window.dispatchEvent(new CustomEvent('avgst:preview-selection', { detail: { path: parent, key: part.key, title: partTitle(part.key, part.title) } }))}><IconComponents className="size-4 text-muted-foreground" />{partTitle(part.key, part.title)}</Button>
        <Button size="icon-sm" variant="ghost" className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100" asChild><a href={record.editURL || `${editURL}#part-${part.key}`} aria-label={`Редактировать «${partTitle(part.key, part.title)}»`} title={`Редактировать «${partTitle(part.key, part.title)}»`}><IconPencil /></a></Button>
      </div>
      {slotsOf(part.key).map(slot => <div key={slot.key} className="group ml-6 flex items-center gap-1">
        <Button type="button" variant="ghost" className="flex-1 justify-start" onClick={() => window.dispatchEvent(new CustomEvent('avgst:preview-selection', { detail: { path: parent, key: slot.key, title: slot.title } }))}><IconComponents className="size-4 text-muted-foreground" />{slot.title}</Button>
        <Button size="icon-sm" variant="ghost" className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100" asChild><a href={`${editURL}#part-${slot.key}`} aria-label={`Редактировать «${slot.title}»`} title={`Редактировать «${slot.title}»`}><IconPencil /></a></Button>
      </div>)}
    </div>)}</div>
  </div>
}
