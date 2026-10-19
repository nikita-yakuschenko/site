'use client'

import { useField } from '@payloadcms/ui'
import { useEffect, useRef, useState } from 'react'
import type { RelationshipFieldClientProps } from 'payload'
import { IconBuildingCommunity, IconSearch, IconX } from '@tabler/icons-react'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { Input } from '../ui/input'
import { Attachment, AttachmentAction, AttachmentActions, AttachmentContent, AttachmentDescription, AttachmentMedia, AttachmentTitle, AttachmentTrigger } from '../ui/attachment'

type CatalogOption = { id: number | string; name: string; slug: string; image?: string }

function mediaId(value: unknown) {
  if (value == null) return null
  if (typeof value === 'object' && value && 'id' in value) return (value as { id: number | string }).id
  return value as number | string
}

export function StoryProjectPicker({ path }: RelationshipFieldClientProps) {
  const field = useField<number | string | { id?: number | string } | null>({ path: path || 'project' })
  const siteUrl = process.env.SITE_PUBLIC_URL || (process.env.NODE_ENV === 'production' ? 'https://new.avgst.ru' : 'http://localhost:3000')
  const origin = new URL(siteUrl).origin
  const [items, setItems] = useState<CatalogOption[]>([])
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [pinned, setPinned] = useState<CatalogOption | null>(null)
  const frame = useRef<HTMLIFrameElement>(null)
  const selectedId = mediaId(field.value)
  const chosen = items.find(item => String(item.id) === String(selectedId)) || null
  const shown = pinned || chosen
  const query = search.trim().toLocaleLowerCase('ru')
  const matches = items.filter(item => `${item.name} ${item.slug}`.toLocaleLowerCase('ru').includes(query))

  useEffect(() => {
    const controller = new AbortController()
    const toOption = (doc: { id: number | string; name?: string; slug?: string; desktopImage?: { url?: string } | null; imageUrl?: string | null }): CatalogOption | null => {
      if (!doc.id || !doc.name || !doc.slug) return null
      const photo = doc.desktopImage && typeof doc.desktopImage === 'object' ? doc.desktopImage.url : ''
      return { id: doc.id, name: doc.name, slug: doc.slug, image: photo ? new URL(photo, window.location.origin).href : doc.imageUrl || undefined }
    }
    fetch('/api/projects?limit=300&depth=1&sort=name&where[_status][equals]=published', { credentials: 'include', signal: controller.signal })
      .then(response => response.ok ? response.json() : null)
      .then(result => setItems((result?.docs || []).flatMap((doc: Parameters<typeof toOption>[0]) => { const item = toOption(doc); return item ? [item] : [] })))
      .catch(() => {})
    return () => controller.abort()
  }, [])

  // Уже выбранный проект мог не попасть в первую порцию списка — дотягиваем карточку.
  useEffect(() => {
    if (!selectedId) return
    const controller = new AbortController()
    fetch(`/api/projects/${selectedId}?depth=1`, { credentials: 'include', signal: controller.signal })
      .then(response => response.ok ? response.json() : null)
      .then(doc => {
        if (!doc?.id || !doc.name || !doc.slug) return
        const photo = doc.desktopImage && typeof doc.desktopImage === 'object' ? doc.desktopImage.url : ''
        const next = { id: doc.id, name: String(doc.name), slug: String(doc.slug), image: photo ? new URL(photo, window.location.origin).href : doc.imageUrl || undefined }
        setItems(current => current.some(item => String(item.id) === String(next.id)) ? current : [...current, next])
      })
      .catch(() => {})
    return () => controller.abort()
  }, [selectedId])

  useEffect(() => {
    if (!open || !shown?.slug) return
    const send = () => frame.current?.contentWindow?.postMessage({ type: 'avgst:preview-block', key: 'projectHero', dim: true }, origin)
    const timer = setTimeout(send, 120)
    const receive = (event: MessageEvent) => {
      if (event.origin === origin && event.source === frame.current?.contentWindow && event.data?.type === 'avgst:preview-ready') send()
    }
    window.addEventListener('message', receive)
    return () => { clearTimeout(timer); window.removeEventListener('message', receive) }
  }, [open, shown?.slug, origin])

  const close = () => { setOpen(false); setSearch(''); setPinned(null) }
  const confirm = () => { if (!pinned) return; field.setValue(pinned.id); close() }
  const scale = 0.28

  return <>
    <Attachment state={chosen ? 'done' : 'idle'} className="w-full">
      <AttachmentMedia variant="icon"><IconBuildingCommunity /></AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle>{chosen?.name || 'Выберите проект'}</AttachmentTitle>
        <AttachmentDescription>{chosen ? chosen.slug : 'Из каталога'}</AttachmentDescription>
      </AttachmentContent>
      {chosen ? <AttachmentActions><AttachmentAction type="button" aria-label="Убрать проект" onClick={() => field.setValue(null)}><IconX /></AttachmentAction></AttachmentActions> : null}
      <AttachmentTrigger aria-label={chosen ? `Заменить ${chosen.name}` : 'Выберите проект'} onClick={() => setOpen(true)} />
    </Attachment>
    <Dialog open={open} onOpenChange={next => { if (next) setOpen(true); else close() }}>
      <DialogContent className="shadcn-surface sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Проект каталога</DialogTitle>
          <DialogDescription>Найдите проект слева. Справа — главный экран; просмотр не засчитывается.</DialogDescription>
        </DialogHeader>
        <div className="grid items-start gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div className="flex min-w-0 flex-col gap-4">
            <div className="relative">
              <IconSearch className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input aria-label="Поиск проекта" placeholder="Поиск проекта" className="pl-9" value={search} onChange={event => setSearch(event.target.value)} />
            </div>
            <div className="max-h-96 min-h-80 overflow-auto">
              {matches.map(item => <button key={item.id} type="button" className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-muted ${String(item.id) === String(shown?.id) ? 'bg-muted' : ''}`} onClick={() => setPinned(item)}>
                {item.image ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={item.image} alt="" className="size-12 shrink-0 rounded-md object-cover" /> : <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"><IconBuildingCommunity className="size-5" /></span>}
                <span className="min-w-0"><span className="block truncate text-sm font-medium">{item.name}</span><span className="block truncate text-xs text-muted-foreground">{item.slug}</span></span>
              </button>)}
              {matches.length === 0 ? <p className="px-2 py-6 text-center text-sm text-muted-foreground">Ничего не найдено</p> : null}
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <div className="story-project-picker-preview">
              {shown?.slug
                ? <iframe ref={frame} key={shown.slug} title={`Превью ${shown.name}`} src={`${siteUrl}/catalog/${shown.slug}?cmsPreview=1`} onLoad={() => frame.current?.contentWindow?.postMessage({ type: 'avgst:preview-block', key: 'projectHero', dim: true }, origin)} style={{ transform: `scale(${scale})` }} />
                : <p className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">Выберите проект слева</p>}
            </div>
            <DialogFooter className="sm:justify-end">
              <Button type="button" disabled={!pinned} onClick={confirm}>Подтвердить</Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </>
}
