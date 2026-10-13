'use client'

import { useEffect, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { useField, useForm, useFormFields } from '@payloadcms/ui'
import type { UploadFieldClientProps } from 'payload'
import { VkLogo } from './VkLogo'
import { IconLink, IconLoader2, IconPhoto, IconPlayerPlay, IconStar, IconStarFilled, IconX } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { builtVideoEmbed, detectBuiltVideo } from '../../config/built-media'
import { toast } from 'sonner'
import { Attachment, AttachmentAction, AttachmentActions, AttachmentContent, AttachmentDescription, AttachmentMedia, AttachmentTitle, AttachmentTrigger } from '@/components/ui/attachment'
import { ImagePreviewOverlay, type PreviewImage } from './ImagePreviewOverlay'

type GalleryTarget = 'exteriors' | 'interiors' | 'built'
type GalleryRow = { photo?: unknown; type?: string; isPrimary?: boolean }
type PendingFile = { key: string; name: string; progress: number; error?: string; mediaId?: number }
type MediaDoc = { id: number; filename?: string; mimeType?: string; filesize?: number; url?: string; thumbnailURL?: string | null }

const imageTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif'])

function isImage(file: File) {
  return imageTypes.has(file.type) || /\.(jpe?g|png|webp|avif)$/i.test(file.name)
}

function photoId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value)
  if (value && typeof value === 'object' && 'id' in value) return photoId((value as { id: unknown }).id)
  return null
}

function photoSlot(path: string) {
  const match = /^(.*)\.(\d+)\.photo$/.exec(path)
  return match ? { arrayPath: match[1], index: Number(match[2]) } : null
}

function rowAcceptsPhoto(row: GalleryRow | undefined, arrayPath: string) {
  if (photoId(row?.photo)) return false
  return !(arrayPath === 'built' && row?.type === 'video')
}

function kindLabel(mime?: string, name?: string) {
  const source = `${mime || ''} ${name || ''}`.toLowerCase()
  if (source.includes('png')) return 'PNG'
  if (source.includes('webp')) return 'WebP'
  if (source.includes('avif')) return 'AVIF'
  if (source.includes('jpeg') || source.includes('jpg')) return 'JPG'
  return 'Файл'
}

function sizeLabel(bytes?: number) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} КБ`
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`
}

function fileSummary(mime?: string, name?: string, bytes?: number) {
  const size = sizeLabel(bytes)
  return size ? `${kindLabel(mime, name)} · ${size}` : kindLabel(mime, name)
}

function uploadMedia(file: File, onProgress: (percent: number) => void) {
  return new Promise<number>((resolve, reject) => {
    const body = new FormData()
    body.append('file', file)
    const request = new XMLHttpRequest()
    request.open('POST', '/api/media')
    request.withCredentials = true
    request.upload.onprogress = event => {
      if (event.lengthComputable) onProgress(Math.min(99, Math.round(event.loaded / event.total * 100)))
    }
    request.onload = () => {
      const result = JSON.parse(request.responseText || 'null')
      const id = result?.doc?.id ?? result?.id
      if (request.status >= 200 && request.status < 300 && typeof id === 'number') resolve(id)
      else reject(new Error(result?.errors?.[0]?.message || 'Не удалось загрузить фото'))
    }
    request.onerror = () => reject(new Error('Не удалось загрузить фото'))
    request.send(body)
  })
}

function usePhotoPlacer() {
  const { addFieldRow, dispatchFields, getDataByPath, setModified } = useForm()
  const timers = useRef<number[]>([])
  useEffect(() => () => { timers.current.forEach(id => window.clearTimeout(id)) }, [])
  return (arrayPath: string, ids: number[], startIndex: number) => {
    const rows = (getDataByPath(arrayPath) as GalleryRow[] | null) || []
    const fresh: number[] = []
    let cursor = startIndex
    for (const id of ids) {
      let placed = false
      while (cursor < rows.length) {
        const index = cursor
        cursor += 1
        if (rowAcceptsPhoto(rows[index], arrayPath)) {
          dispatchFields({ type: 'UPDATE', path: `${arrayPath}.${index}.photo`, value: id })
          placed = true
          break
        }
      }
      if (!placed) fresh.push(id)
    }
    fresh.forEach((id, offset) => {
      addFieldRow({
        path: arrayPath,
        schemaPath: arrayPath.replace(/\.\d+(?=\.|$)/g, ''),
        rowIndex: rows.length + offset,
        subFieldState: {
          photo: { initialValue: id, valid: true, value: id },
          ...(arrayPath === 'built' ? { type: { initialValue: 'photo', valid: true, value: 'photo' } } : {}),
          ...(arrayPath === 'exteriors' || arrayPath === 'built' ? { isPrimary: { initialValue: false, valid: true, value: false } } : {}),
        },
      })
    })
    setModified(true)
    if (!fresh.length) return
    timers.current.push(window.setTimeout(() => {
      fresh.forEach((id, offset) => {
        const path = `${arrayPath}.${rows.length + offset}.photo`
        if (!photoId(getDataByPath(path))) dispatchFields({ type: 'UPDATE', path, value: id })
      })
    }, 1200))
  }
}

function useMediaDocs(ids: number[]) {
  const [docs, setDocs] = useState<Record<number, MediaDoc>>({})
  const key = ids.join(',')
  useEffect(() => {
    const missing = ids.filter(id => !docs[id])
    if (!missing.length) return
    let cancelled = false
    Promise.all(missing.map(async id => {
      const response = await fetch(`/api/media/${id}?depth=0`, { credentials: 'include' })
      if (!response.ok) return null
      return response.json() as Promise<MediaDoc>
    })).then(items => {
      if (cancelled) return
      setDocs(current => {
        const next = { ...current }
        for (const item of items) if (item && typeof item.id === 'number') next[item.id] = item
        return next
      })
    })
    return () => { cancelled = true }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  return docs
}

function FileAttachment({ name, description, state, imageUrl, icon, onRemove, onOpen, onPrimary, primary, caption, kind }: {
  name: string
  description: string
  state: 'idle' | 'uploading' | 'error' | 'done'
  imageUrl?: string
  icon?: ReactNode
  onRemove?: () => void
  onOpen?: () => void
  onPrimary?: () => void
  primary?: boolean
  caption?: { value: string; onChange: (value: string) => void }
  kind?: { icon: ReactNode; label: string }
}) {
  return <Attachment state={state} className="w-full">
    <AttachmentMedia variant={imageUrl && state !== 'uploading' ? 'image' : 'icon'}>
      {state === 'uploading' ? <IconLoader2 className="animate-spin" /> : imageUrl ? <img src={imageUrl} alt="" draggable={false} /> : icon || <IconPhoto />}
    </AttachmentMedia>
    <AttachmentContent className={caption ? 'w-23 flex-none' : undefined}>
      <AttachmentTitle title={name}>{name}</AttachmentTitle>
      <AttachmentDescription>{description}</AttachmentDescription>
    </AttachmentContent>
    {caption ? <div className="relative z-20 ml-3 min-w-0 flex-1 self-center">
      <Input className="h-8 w-full" placeholder="Подпись" aria-label={`Подпись ${name}`} value={caption.value} onChange={event => caption.onChange(event.target.value)} onKeyDown={event => event.stopPropagation()} draggable={false} onDragStart={event => { event.preventDefault(); event.stopPropagation() }} />
    </div> : null}
    {(onRemove || onPrimary || kind) ? <AttachmentActions className="gap-1">
      {kind ? <span className="flex size-6 items-center justify-center text-muted-foreground [&_svg]:size-4" title={kind.label} aria-label={kind.label}>{kind.icon}</span> : null}
      {onPrimary ? <AttachmentAction type="button" aria-label={primary ? `Главное фото ${name}` : `Сделать главным ${name}`} aria-pressed={primary} onClick={onPrimary}>{primary ? <IconStarFilled /> : <IconStar />}</AttachmentAction> : null}
      {onRemove ? <AttachmentAction type="button" aria-label={`Удалить ${name}`} onClick={onRemove}><IconX /></AttachmentAction> : null}
    </AttachmentActions> : null}
    {onOpen ? <AttachmentTrigger aria-label={state === 'idle' ? name : `Открыть ${name}`} onClick={onOpen} /> : null}
  </Attachment>
}

type RowDrag = { from: number; insertAt: number; stride: number; row: number }

function rowShift(index: number, drag: RowDrag | null) {
  if (!drag || drag.insertAt === drag.from || drag.insertAt === drag.from + 1 || index === drag.from) return 0
  if (drag.from < drag.insertAt && index > drag.from && index < drag.insertAt) return -drag.stride
  if (drag.insertAt < drag.from && index >= drag.insertAt && index < drag.from) return drag.stride
  return 0
}

function gallerySignature(target: string, fields: Record<string, { value?: unknown } | undefined>) {
  const parts: string[] = []
  for (let index = 0; index < 300; index += 1) {
    const row = fields[`${target}.${index}.id`] || fields[`${target}.${index}.photo`] || fields[`${target}.${index}.image`]
    if (!row && index > 0 && !fields[`${target}.${index - 1}.id`]) break
    if (!fields[`${target}.${index}.id`] && !fields[`${target}.${index}.photo`] && !fields[`${target}.${index}.image`]) break
    parts.push([index, photoId(fields[`${target}.${index}.photo`]?.value) ?? '', fields[`${target}.${index}.isPrimary`]?.value ? 1 : 0].join(':'))
  }
  return parts.join('|')
}

export function GalleryBatchUpload({ target }: { target: GalleryTarget }) {
  const place = usePhotoPlacer()
  const { addFieldRow, dispatchFields, getFields, moveFieldRow, removeFieldRow, setModified } = useForm()
  const signature = useFormFields(([fields]) => gallerySignature(target, fields))
  const rows = signature ? signature.split('|').map(part => {
    const [index, photo, primary] = part.split(':')
    return { index: Number(index), photo: photo ? Number(photo) : null, primary: primary === '1' }
  }) : []
  const docs = useMediaDocs(rows.flatMap(row => row.photo ? [row.photo] : []))
  const built = target === 'built'
  // Built rows also carry a type, video link and caption; serialised so unrelated edits do not re-render.
  const builtMeta = useFormFields(([fields]) => built ? JSON.stringify(rows.map(row => ({
    type: fields[`built.${row.index}.type`]?.value === 'video' ? 'video' : 'photo',
    url: typeof fields[`built.${row.index}.videoUrl`]?.value === 'string' ? fields[`built.${row.index}.videoUrl`]!.value : '',
    caption: typeof fields[`built.${row.index}.caption`]?.value === 'string' ? fields[`built.${row.index}.caption`]!.value : '',
  }))) : '[]')
  const meta = JSON.parse(builtMeta) as { type: 'photo' | 'video'; url: string; caption: string }[]
  const [videoDialog, setVideoDialog] = useState<{ index: number | null; url: string; caption: string } | null>(null)
  const known = useRef(new Map<number, { name: string; size: number; type: string }>())
  const fileInput = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<PendingFile[]>([])
  const [preview, setPreview] = useState<PreviewImage | null>(null)
  const [fileDrag, setFileDrag] = useState(false)
  const [rowDrag, setRowDrag] = useState<RowDrag | null>(null)
  const rowDragRef = useRef<RowDrag | null>(null)
  const sortRef = useRef<HTMLDivElement>(null)
  const run = async (files: File[]) => {
    const images = files.filter(isImage)
    if (files.some(file => file.type.startsWith('video/'))) toast.error('Видео загрузите в Kinescope или VK Видео и вставьте ссылку на ролик')
    else if (images.length !== files.length) toast.error('Можно загружать только JPG, PNG, WebP и AVIF')
    for (const file of images) {
      const key = `${file.name}-${crypto.randomUUID()}`
      setPending(current => [...current, { key, name: file.name, progress: 0 }])
      try {
        const id = await uploadMedia(file, progress => setPending(current => current.map(item => item.key === key ? { ...item, progress } : item)))
        known.current.set(id, { name: file.name, size: file.size, type: file.type })
        place(target, [id], 0)
        setPending(current => current.map(item => item.key === key ? { ...item, mediaId: id, progress: 100 } : item))
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Не удалось загрузить фото'
        setPending(current => current.map(item => item.key === key ? { ...item, error: message, progress: 0 } : item))
      }
    }
  }
  const photos = rows.filter((row, position) => row.photo || meta[position]?.type === 'video')
  const metaOf = (row: { index: number }) => meta[rows.indexOf(row as typeof rows[number])]
  const setField = (path: string, value: unknown) => {
    dispatchFields({ type: 'UPDATE', path, value })
    setModified(true)
  }
  const makePrimary = (row: { index: number; primary: boolean }) => {
    if (row.primary) return
    const fields = getFields()
    const updates: typeof fields = {}
    for (const fieldPath of Object.keys(fields)) {
      if (fieldPath.startsWith(`${target}.`) && fieldPath.endsWith('.isPrimary')) updates[fieldPath] = { ...fields[fieldPath], value: fieldPath === `${target}.${row.index}.isPrimary` }
    }
    dispatchFields({ type: 'UPDATE_MANY', formState: updates })
    setModified(true)
  }
  const gapOpen = Boolean(rowDrag && rowDrag.insertAt !== rowDrag.from && rowDrag.insertAt !== rowDrag.from + 1)
  const rememberDrag = (next: RowDrag | null) => {
    rowDragRef.current = next
    setRowDrag(next)
  }
  const trackRow = (event: DragEvent<HTMLDivElement>) => {
    const current = rowDragRef.current
    if (!current || !sortRef.current || Array.from(event.dataTransfer.types).includes('Files')) return
    event.preventDefault()
    const top = sortRef.current.getBoundingClientRect().top
    const insertAt = Math.max(0, Math.min(photos.length, Math.round((event.clientY - top) / current.stride)))
    if (insertAt === current.insertAt) return
    rememberDrag({ ...current, insertAt })
  }
  const dropRow = (event: DragEvent<HTMLDivElement>) => {
    const current = rowDragRef.current
    if (!current || Array.from(event.dataTransfer.types).includes('Files')) return
    event.preventDefault()
    event.stopPropagation()
    rememberDrag(null)
    const fromForm = photos[current.from]?.index
    if (fromForm == null || current.insertAt === current.from || current.insertAt === current.from + 1) return
    const anchor = current.insertAt >= photos.length ? photos[photos.length - 1].index : photos[current.insertAt].index
    const moveToIndex = current.insertAt >= photos.length ? (fromForm < anchor ? anchor : anchor + 1) : anchor - (anchor > fromForm ? 1 : 0)
    if (moveToIndex !== fromForm) moveFieldRow({ path: target, moveFromIndex: fromForm, moveToIndex })
  }
  return <div className={fileDrag ? 'attachment-list is-drag' : 'attachment-list'} onDragOver={event => {
    if (!event.dataTransfer || !Array.from(event.dataTransfer.types).includes('Files')) return
    event.preventDefault()
    setFileDrag(true)
  }} onDragLeave={() => setFileDrag(false)} onDrop={event => {
    const files = [...(event.dataTransfer?.files || [])]
    if (!files.length) return
    event.preventDefault()
    setFileDrag(false)
    void run(files)
  }}>
    <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple hidden onChange={event => {
      const files = [...(event.target.files || [])]
      event.target.value = ''
      void run(files)
    }} />
    <div className="flex items-stretch gap-2">
      <div className="min-w-0 flex-1">
        <FileAttachment name="Перетащите фото сюда" description="JPG, PNG, WebP или AVIF. Можно сразу несколько." state="idle" onOpen={() => fileInput.current?.click()} />
      </div>
      {built ? <Button type="button" variant="outline" className="h-auto shrink-0 rounded-xl border-dashed px-4" onClick={() => setVideoDialog({ index: null, url: '', caption: '' })}>
        <IconPlayerPlay /> Добавить видео
      </Button> : null}
    </div>
    <div ref={sortRef} className="gallery-sort" onDragOver={trackRow} onDrop={dropRow}>
      {gapOpen && rowDrag ? <div className="gallery-insert" style={{ top: (rowDrag.insertAt > rowDrag.from ? rowDrag.insertAt - 1 : rowDrag.insertAt) * rowDrag.stride, height: rowDrag.row }} /> : null}
      {photos.map((row, visual) => {
        const doc = row.photo ? docs[row.photo] : undefined
        const local = row.photo ? known.current.get(row.photo) : undefined
        const info = built ? metaOf(row) : undefined
        const video = info?.type === 'video' ? detectBuiltVideo(info.url) : null
        const isVideo = info?.type === 'video'
        const name = isVideo ? (video?.provider === 'vk' ? 'VK Видео' : video ? 'Kinescope' : 'Видео') : doc?.filename || local?.name || 'Фото'
        const url = doc?.url || ''
        const shift = rowShift(visual, rowDrag)
        const kind = isVideo
          ? { icon: video?.provider === 'vk' ? <VkLogo /> : video ? <IconPlayerPlay /> : <IconLink />, label: video?.provider === 'vk' ? 'Видео VK' : video ? 'Видео Kinescope' : 'Видео по ссылке' }
          : { icon: <IconPhoto />, label: 'Фото' }
        return <div key={`${row.index}-${row.photo ?? 'video'}`} className={rowDrag?.from === visual ? 'gallery-sort__item is-dragging' : 'gallery-sort__item'} style={shift ? { transform: `translateY(${shift}px)` } : undefined} draggable onDragStart={event => {
          const item = event.currentTarget
          const gap = sortRef.current ? Number.parseFloat(getComputedStyle(sortRef.current).rowGap) || 8 : 8
          const height = item.getBoundingClientRect().height
          event.dataTransfer.effectAllowed = 'move'
          event.dataTransfer.setData('text/plain', 'reorder')
          rememberDrag({ from: visual, insertAt: visual, stride: height + gap, row: height })
        }} onDragEnd={() => rememberDrag(null)}>
          <FileAttachment name={name} state="done" imageUrl={doc?.thumbnailURL || url || undefined} icon={isVideo ? kind.icon : undefined}
            description={isVideo ? (info?.url || 'Ссылка не указана') : fileSummary(doc?.mimeType || local?.type, name, doc?.filesize || local?.size)}
            kind={built ? kind : undefined}
            caption={built ? { value: info?.caption || '', onChange: value => setField(`built.${row.index}.caption`, value) } : undefined}
            primary={target !== 'interiors' && row.primary} onPrimary={target !== 'interiors' ? () => makePrimary(row) : undefined}
            onRemove={() => removeFieldRow({ path: target, rowIndex: row.index })}
            onOpen={video ? () => setPreview({ src: builtVideoEmbed(video), title: info?.caption || name, embed: true }) : !isVideo && url ? () => setPreview({ src: url, title: name }) : undefined} />
        </div>
      })}
    </div>
    {built ? <BuiltVideoDialog state={videoDialog} onClose={() => setVideoDialog(null)} onSave={({ index, url, caption }) => {
      const video = detectBuiltVideo(url)
      if (index == null) {
        addFieldRow({ path: 'built', schemaPath: 'built', rowIndex: rows.length, subFieldState: {
          type: { initialValue: 'video', valid: true, value: 'video' },
          provider: { initialValue: video?.provider ?? null, valid: true, value: video?.provider ?? null },
          videoUrl: { initialValue: url, valid: true, value: url },
          caption: { initialValue: caption, valid: true, value: caption },
          isPrimary: { initialValue: false, valid: true, value: false },
        } })
      } else {
        setField(`built.${index}.videoUrl`, url)
        setField(`built.${index}.provider`, video?.provider ?? null)
        setField(`built.${index}.caption`, caption)
      }
      setVideoDialog(null)
    }} /> : null}
    {pending.filter(item => !item.mediaId || !rows.some(row => row.photo === item.mediaId)).map(item => <FileAttachment key={item.key} name={item.name} description={item.error || `Загрузка · ${item.progress}%`} state={item.error ? 'error' : 'uploading'} onRemove={() => setPending(current => current.filter(entry => entry.key !== item.key))} />)}
    <ImagePreviewOverlay image={preview} onClose={() => setPreview(null)} />
  </div>
}

type VideoDraft = { index: number | null; url: string; caption: string }

function BuiltVideoDialog({ state, onClose, onSave }: { state: VideoDraft | null; onClose: () => void; onSave: (draft: VideoDraft) => void }) {
  const [url, setUrl] = useState('')
  const [caption, setCaption] = useState('')
  const [touched, setTouched] = useState(false)
  useEffect(() => {
    if (!state) return
    setUrl(state.url)
    setCaption(state.caption)
    setTouched(false)
  }, [state])
  const video = detectBuiltVideo(url)
  const invalid = touched && url.trim() !== '' && !video
  const save = () => {
    setTouched(true)
    if (video && state) onSave({ index: state.index, url: url.trim(), caption: caption.trim() })
  }
  return <Dialog open={Boolean(state)} onOpenChange={open => { if (!open) onClose() }}>
    <DialogContent className="shadcn-surface sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{state?.index == null ? 'Добавить видео' : 'Видео'}</DialogTitle>
        <DialogDescription>Вставьте ссылку на ролик в VK Видео или Kinescope. Платформа определится сама.</DialogDescription>
      </DialogHeader>
      <form className="grid gap-4" onSubmit={event => { event.preventDefault(); event.stopPropagation(); save() }}>
        <div className="grid gap-2">
          <label htmlFor="built-video-url" className="text-sm font-medium">Ссылка</label>
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-2.5 flex size-5 -translate-y-1/2 items-center justify-center text-muted-foreground">
              {video?.provider === 'vk' ? <VkLogo className="size-5" /> : video ? <IconPlayerPlay className="size-4" /> : <IconLink className="size-4" />}
            </span>
            <Input id="built-video-url" autoFocus className="pl-9" placeholder="https://vk.com/video-… или https://kinescope.io/…" value={url} aria-invalid={invalid || undefined}
              onChange={event => setUrl(event.target.value)} onBlur={() => setTouched(true)} />
          </div>
          <p className={invalid ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}>
            {invalid ? 'Не похоже на ссылку VK Видео или Kinescope' : video ? (video.provider === 'vk' ? 'VK Видео' : 'Kinescope') : 'Поддерживаются VK Видео и Kinescope'}
          </p>
        </div>
        <div className="grid gap-2">
          <label htmlFor="built-video-caption" className="text-sm font-medium">Подпись</label>
          <Input id="built-video-caption" placeholder="Необязательно" value={caption} onChange={event => setCaption(event.target.value)} />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Отмена</Button>
          <Button type="submit" disabled={!video}>{state?.index == null ? 'Добавить' : 'Сохранить'}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
}

export function ProjectImageUpload(props: UploadFieldClientProps & { imageKind?: 'plan' }) {
  const plan = props.imageKind === 'plan'
  const slot = photoSlot(props.path)
  const listedGallery = Boolean(slot && /^(exteriors|interiors|built)$/.test(slot.arrayPath))
  const rowType = useFormFields(([fields]) => slot ? fields[`${slot.arrayPath}.${slot.index}.type`]?.value : null)
  const place = usePhotoPlacer()
  const { setValue, value } = useField<number | null>({ path: props.path })
  const id = photoId(value)
  const docs = useMediaDocs(id ? [id] : [])
  const known = useRef(new Map<number, { name: string; size: number; type: string }>())
  const fileInput = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<PendingFile[]>([])
  const [preview, setPreview] = useState<PreviewImage | null>(null)
  const field = props.field as { label?: unknown; admin?: { description?: unknown } }
  const label = typeof field.label === 'string' ? field.label : ''
  const hint = typeof field.admin?.description === 'string' ? field.admin.description : ''
  const run = async (files: File[]) => {
    const images = files.filter(isImage)
    if (!images.length) {
      if (files.length) toast.error('Можно загружать только JPG, PNG, WebP или AVIF')
      return
    }
    if (!slot && images.length > 1) toast.message('В это поле можно загрузить одно изображение')
    const batch = slot ? images : images.slice(0, 1)
    for (const [index, file] of batch.entries()) {
      const key = `${file.name}-${crypto.randomUUID()}`
      setPending(current => [...current, { key, name: file.name, progress: 0 }])
      try {
        const mediaId = await uploadMedia(file, progress => setPending(current => current.map(item => item.key === key ? { ...item, progress } : item)))
        known.current.set(mediaId, { name: file.name, size: file.size, type: file.type })
        if (index === 0) setValue(mediaId)
        else if (slot) place(slot.arrayPath, [mediaId], slot.index + 1)
        setPending(current => current.filter(item => item.key !== key))
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Не удалось загрузить фото'
        setPending(current => current.map(item => item.key === key ? { ...item, error: message, progress: 0 } : item))
      }
    }
  }
  if (listedGallery) return null
  const doc = id ? docs[id] : undefined
  const local = id ? known.current.get(id) : undefined
  const name = doc?.filename || local?.name || label || 'Фото'
  const url = doc?.url || ''
  const idleName = plan ? 'Перетащите планировку сюда' : rowType === 'video' ? 'Обложка видео' : 'Перетащите фото сюда'
  return <div className="attachment-list" onDragOver={event => {
    if (!event.dataTransfer || !Array.from(event.dataTransfer.types).includes('Files')) return
    event.preventDefault()
  }} onDrop={event => {
    const files = [...(event.dataTransfer?.files || [])]
    if (!files.length) return
    event.preventDefault()
    void run(files)
  }}>
    {label ? <span className="field-label">{label}</span> : null}
    <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple={Boolean(slot)} hidden onChange={event => {
      const files = [...(event.target.files || [])]
      event.target.value = ''
      void run(files)
    }} />
    {id ? <FileAttachment name={name} description={fileSummary(doc?.mimeType || local?.type, name, doc?.filesize || local?.size)} state="done" imageUrl={doc?.thumbnailURL || url || undefined} onRemove={() => setValue(null)} onOpen={url ? () => setPreview({ src: url, title: name }) : undefined} /> : null}
    {pending.map(item => <FileAttachment key={item.key} name={item.name} description={item.error || `Загрузка · ${item.progress}%`} state={item.error ? 'error' : 'uploading'} onRemove={() => setPending(current => current.filter(entry => entry.key !== item.key))} />)}
    {!id && !pending.length ? <FileAttachment name={idleName} description="JPG, PNG, WebP или AVIF" state="idle" onOpen={() => fileInput.current?.click()} /> : null}
    {hint ? <p className="field-description">{hint}</p> : null}
    <ImagePreviewOverlay image={preview} onClose={() => setPreview(null)} />
  </div>
}
