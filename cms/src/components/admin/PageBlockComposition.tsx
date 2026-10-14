'use client'
import { useCollapsible, useField, useFormFields, useRowLabel } from '@payloadcms/ui'
import { useEffect, useState } from 'react'
import type { TextareaFieldClientProps, UIFieldClientProps, UploadFieldClientProps } from 'payload'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'
import { Input } from '../ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Attachment, AttachmentAction, AttachmentActions, AttachmentContent, AttachmentDescription, AttachmentMedia, AttachmentTitle, AttachmentTrigger } from '../ui/attachment'
import { IconComponents, IconPencil, IconSearch, IconX } from '@tabler/icons-react'
import { mediaDocumentId } from './media-id'
import { ProjectImageUpload } from './ProjectImageUpload'

// The card header already names the part. Inside, the person edits the words the site shows.
const partFields: Record<string, { name: 'text' | 'textMore' | 'href'; label: string; rows?: number; bare?: boolean }[]> = {
  'hero.heading': [{ name: 'text', label: 'Первая строка', rows: 2 }, { name: 'textMore', label: 'Вторая строка', rows: 2 }],
  'hero.subtitle': [{ name: 'text', label: 'Текст', rows: 3 }],
  'hero.button': [{ name: 'text', label: 'Надпись', rows: 2 }, { name: 'href', label: 'Ссылка' }],
  'popularProjects.heading': [{ name: 'text', label: 'Заголовок', bare: true }],
  'popularProjects.button': [{ name: 'text', label: 'Текст кнопки', bare: true }],
  'seriesBento.heading': [{ name: 'text', label: 'Заголовок', bare: true }],
  'seriesBento.button': [{ name: 'text', label: 'Текст кнопки', bare: true }],
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

function HeroPromoFields({ row, partKey }: { row: string; partKey: string }) {
  const title = useField<string>({ path: `${row}.title` })
  const eyebrow = useField<string>({ path: `${row}.textMore` })
  const text = useField<string>({ path: `${row}.text` })
  const cta = useField<string>({ path: `${row}.href` })
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
    window.dispatchEvent(new CustomEvent('avgst:part-draft', { detail: { key: partKey, title: title.value || '', textMore: eyebrow.value || '', text: text.value || '', href: cta.value || '', image: imageUrl } }))
  }, [partKey, title.value, eyebrow.value, text.value, cta.value, imageUrl])
  return <div className="promo-fields">
    <ProjectImageUpload path={`${row}.image`} field={{ name: 'image', label: 'Изображение', type: 'upload', relationTo: 'media' } as UploadFieldClientProps['field']} />
    <div className="field-type text"><label className="field-label" htmlFor={`${row}-eyebrow`}>Надстрочник</label><input id={`${row}-eyebrow`} type="text" value={eyebrow.value || ''} onChange={event => eyebrow.setValue(event.target.value)} /></div>
    <div className="field-type text"><label className="field-label" htmlFor={`${row}-title`}>Заголовок</label><input id={`${row}-title`} type="text" value={title.value || ''} onChange={event => title.setValue(event.target.value)} /></div>
    <div className="field-type textarea"><label className="field-label" htmlFor={`${row}-text`}>Текст</label><textarea id={`${row}-text`} rows={2} value={text.value || ''} onChange={event => text.setValue(event.target.value)} /></div>
    <div className="field-type text"><label className="field-label" htmlFor={`${row}-cta`}>Кнопка</label><input id={`${row}-cta`} type="text" value={cta.value || ''} onChange={event => cta.setValue(event.target.value)} /></div>
  </div>
}

function PromoSlot({ row, partKey }: { row: string; partKey: string }) {
  const title = useFormFields(([fields]) => String(fields[`${row}.title`]?.value || ''))
  const [open, setOpen] = useState(false)
  return <div className="promo-slot" data-open={open ? '' : undefined}>
    <button type="button" className="promo-slot__toggle" aria-expanded={open} onClick={() => setOpen(value => { const next = !value; window.dispatchEvent(new CustomEvent('avgst:preview-selection', { detail: next ? { path: row, key: partKey, title: title || partKey } : { path: row, closed: true } })); return next })}>{title || 'Слот'}</button>
    {open ? <div className="promo-slot__body"><HeroPromoFields row={row} partKey={partKey} /></div> : null}
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

export function PartContentFields({ path }: TextareaFieldClientProps) {
  const row = path.replace(/\.text$/, '')
  const key = useFormFields(([fields]) => String(fields[`${row}.key`]?.value || ''))
  const text = useField<string>({ path })
  const more = useField<string>({ path: `${row}.textMore` })
  const link = useField<string>({ path: `${row}.href` })
  const bound = { text, textMore: more, href: link }
  const fields = partFields[key]
  useEffect(() => {
    if (!fields) return
    window.dispatchEvent(new CustomEvent('avgst:part-draft', { detail: { key, text: text.value || '', textMore: more.value || '', href: link.value || '' } }))
  }, [fields, key, text.value, more.value, link.value])
  if (key === 'hero.background') return <HeroBackgroundFields row={row} />
  if (/^popularProjects\.slot\.\d+$/.test(key) || key === 'popularProjects.cards') return key === 'popularProjects.cards' ? <PopularProjectCards /> : null
  if (/^seriesBento\.slot\.\d+$/.test(key) || key === 'seriesBento.cards') return key === 'seriesBento.cards' ? <SeriesSlots /> : null
  if (/^hero\.promo\.\d+$/.test(key)) return null
  if (key === 'hero.promos') return <HeroPromoSlots />
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
  const [record, setRecord] = useState<{ recordKey: string; parts: { key: string; title: string }[] }>()
  useEffect(() => {
    if (!id || !['blocks', 'forms'].includes(component?.relationTo || '')) return
    const controller = new AbortController()
    fetch(`/api/${component?.relationTo}/${id}?depth=0`, { signal: controller.signal }).then(response => response.ok ? response.json() : null).then(data => { if (data) setRecord({ recordKey, parts: data.parts || [] }) }).catch(() => {})
    return () => controller.abort()
  }, [id, component?.relationTo, recordKey])
  if (record?.recordKey !== recordKey) return null
  const editURL = `/collections/${component?.relationTo}/${id}`
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
        <Button size="icon-sm" variant="ghost" className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100" asChild><a href={`${editURL}#part-${part.key}`} aria-label={`Редактировать «${partTitle(part.key, part.title)}»`} title={`Редактировать «${partTitle(part.key, part.title)}»`}><IconPencil /></a></Button>
      </div>
      {slotsOf(part.key).map(slot => <div key={slot.key} className="group ml-6 flex items-center gap-1">
        <Button type="button" variant="ghost" className="flex-1 justify-start" onClick={() => window.dispatchEvent(new CustomEvent('avgst:preview-selection', { detail: { path: parent, key: slot.key, title: slot.title } }))}><IconComponents className="size-4 text-muted-foreground" />{slot.title}</Button>
        <Button size="icon-sm" variant="ghost" className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100" asChild><a href={`${editURL}#part-${slot.key}`} aria-label={`Редактировать «${slot.title}»`} title={`Редактировать «${slot.title}»`}><IconPencil /></a></Button>
      </div>)}
    </div>)}</div>
  </div>
}
