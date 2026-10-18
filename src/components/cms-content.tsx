'use client'

import { cloneElement, createContext, isValidElement, useContext, useEffect, useMemo, useState, type ReactElement, type ReactNode } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { bindMarkedContent, bindReactContent, type ContentField, type ContentPart, type ContentRecord } from '../lib/cms/react-content'

export type { ContentRecord } from '../lib/cms/react-content'
const Context = createContext<ContentRecord[]>([])

export function CMSContentProvider({ records, children }: { records: ContentRecord[]; children: ReactNode }) {
  const [drafts, setDrafts] = useState<Record<string, ContentPart[]>>({})
  useEffect(() => {
    if (window.parent === window) return
    const allowed = new Set(['https://cms.avgst.ru', 'http://localhost:3001'])
    const receive = (event: MessageEvent) => {
      if (event.source !== window.parent || !allowed.has(event.origin) || event.data?.type !== 'avgst:preview-content') return
      if (typeof event.data.key !== 'string' || !Array.isArray(event.data.parts)) return
      setDrafts(current => ({ ...current, [event.data.key]: event.data.parts }))
    }
    window.addEventListener('message', receive)
    return () => window.removeEventListener('message', receive)
  }, [])
  return <Context.Provider value={records.map(record => ({ ...record, parts: drafts[record.key] ?? record.parts }))}>{children}</Context.Provider>
}

export function useCMSMedia<T>(key: string, source: T): T {
  const records = useContext(Context)
  const route = usePathname()
  const indexing = useSearchParams().has('cmsIndex')
  return useMemo(() => {
    const record = records.find(record => record.scope === route && (record.key === key || record.key.startsWith(`${key}-page-`)))
    const images = record?.parts.filter(part => part.key.endsWith('.image') && part.image) || []
    const parts = images.filter(part => part.originalImage)
    if (indexing || !images.length && !record?.gallery) return source
    const path = (value: string) => {
      try {
        const url = new URL(value, 'https://new.avgst.ru')
        return url.pathname === '/_next/image' && url.searchParams.get('url') ? new URL(url.searchParams.get('url')!, url.origin).pathname : url.pathname
      } catch { return value }
    }
    const same = (left: string, right: string) => path(left) === path(right) || path(left).startsWith('/_next/static/media/') && path(left).split('/').pop()?.replace(/\.[^.]+(?=\.[^.]+$)/, '') === path(right).split('/').pop()
    const src = (value: unknown) => typeof value === 'string' ? value : value && typeof value === 'object' && 'src' in value && typeof value.src === 'string' ? value.src : ''
    const walk = (value: unknown): unknown => {
      if (typeof value === 'string') return parts.find(part => same(value, part.originalImage!))?.image || value
      if (Array.isArray(value)) {
        const matches = parts.flatMap(part => { const index = value.findIndex(item => src(item) && same(src(item), part.originalImage!)); return index < 0 ? [] : [index] })
        const ordered = matches.length === value.length && new Set(matches).size === value.length ? matches.map(index => value[index]) : value
        return ordered.map(walk)
      }
      if (value && typeof value === 'object' && !isValidElement(value)) return Object.fromEntries(Object.entries(value).map(([name, item]) => [name, walk(item)]))
      return value
    }
    if (record?.gallery && Array.isArray(source)) return images.filter(part => part.key.includes('.content.gallery.')).map((part, index) => {
      const original = source.find(item => part.originalImage && same(src(item), part.originalImage)) || source[index] || source[0]
      return typeof original === 'string' ? part.image : { ...original, src: part.image, ...(!part.originalImage ? { alt: part.title || '' } : {}) }
    }) as T
    return walk(source) as T
  }, [records, route, key, source, indexing])
}

export function CMSContentBlock({ cmsBlockKey, children, initialFields, mediaBound = false, galleryImages }: { cmsBlockKey: string; children: ReactNode; initialFields?: ContentField[]; mediaBound?: boolean; galleryImages?: readonly string[] }) {
  const records = useContext(Context)
  const route = usePathname()
  const query = useSearchParams()
  const matching = records.filter(record => record.key === cmsBlockKey || record.key.startsWith(`${cmsBlockKey}-page-`))
  const record = matching.find(record => record.scope === route) || matching.find(record => !record.scope)
  const key = record?.key || cmsBlockKey
  const structureOnly = ['ManufactureTruckTransition', 'ManufactureModuleScene'].includes(cmsBlockKey)
  const parts = mediaBound ? record?.parts.filter(part => !part.key.endsWith('.image')) : record?.parts
  const { content, fields } = structureOnly ? { content: children, fields: [] } : initialFields ? { content: bindMarkedContent(children, parts || []), fields: initialFields } : bindReactContent(key, children, parts)
  const indexedFields = galleryImages ? [...fields.filter(field => field.kind !== 'image'), ...galleryImages.map((image, index): ContentField => ({ key: `${key}.content.gallery.${index}.image`, kind: 'image', title: `Изображение ${index + 1}`, image }))] : fields
  const marked = initialFields ? content : isValidElement(content) && (typeof content.type === 'string' || content.type === Link) ? cloneElement(content as ReactElement<Record<string, unknown>>, { 'data-cms-block': key, 'data-cms-content-root': '' }) : <div data-cms-block={key} data-cms-content-root="" style={{ display: 'contents' }}>{content}</div>
  return <>
    {marked}
    {query.has('cmsIndex') && <script type="application/json" data-cms-content-index={key}>{JSON.stringify({ key, route, fields: indexedFields }).replace(/</g, '\\u003c')}</script>}
  </>
}
