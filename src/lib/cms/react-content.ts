import { cloneElement, createElement, isValidElement, type ReactElement, type ReactNode } from 'react'

export type ContentPart = { key: string; title?: string; text?: string; textMore?: string; href?: string; image?: string; originalImage?: string }
export type ContentField = ContentPart & { kind: 'text' | 'image' | 'link' | 'person' }
export type ContentRecord = { key: string; scope?: string; gallery?: boolean; parts: ContentPart[] }
const textProps = new Set(['title', 'heading', 'description', 'label', 'body', 'text', 'cta', 'submitLabel', 'successText', 'imageAlt'])
const labels: Record<string, string> = { title: 'Заголовок', heading: 'Заголовок', description: 'Описание', label: 'Надпись', body: 'Текст', text: 'Текст', cta: 'Кнопка', submitLabel: 'Кнопка отправки', successText: 'Сообщение после отправки', imageAlt: 'Описание изображения' }
const dataProps = new Set(['story', 'entry', 'entries', 'photos', 'items', 'steps', 'partners', 'images', 'videos', 'benefits'])
const technicalKeys = new Set(['id', 'slug', 'className', 'kind', 'variant', 'type', 'icon', 'align', 'programId', 'key', 'formId', 'meta'])

// Rewrite React values, never HTML strings or event handlers. Missing content keeps
// the original value; an explicitly saved empty string clears only that field.
export function bindReactContent(block: string, children: ReactNode, parts: readonly ContentPart[] = [], markText = false) {
  const values = new Map(parts.map(part => [part.key, part]))
  const fields: ContentField[] = []
  const images = new Map<string, string>()
  const field = (path: string, kind: ContentField['kind'], title: string, original: string) => {
    if (kind === 'image' && images.has(original)) {
      const key = images.get(original)!
      return { key, saved: values.get(key) }
    }
    const key = `${block}.content.${path}`
    if (kind === 'image') images.set(original, key)
    fields.push({ key, title, kind, ...(kind === 'link' ? { href: original } : kind === 'image' ? { image: original } : { text: original }) })
    return { key, saved: values.get(key) }
  }
  function data(value: unknown, path: string, name: string): unknown {
    if (technicalKeys.has(name) || isValidElement(value)) return value
    if (typeof value === 'string' && value.trim()) {
      const image = ['image', 'src', 'poster', 'images'].includes(name)
      const link = ['href', 'url', 'link', 'links', 'video', 'embed'].includes(name)
      const item = field(`${path}${image ? '.image' : link ? '.href' : ''}`, image ? 'image' : link ? 'link' : 'text', labels[name] || (image ? 'Изображение' : link ? 'Ссылка' : 'Текст'), value)
      if (!item.saved) return value
      return image ? item.saved.image || value : link ? item.saved.href ?? value : item.saved.text ?? value
    }
    if (Array.isArray(value)) return value.map((item, index) => data(item, `${path}.${index}`, name))
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, data(item, `${path}.${key}`, key)]))
    return value
  }
  function walk(node: ReactNode, path: string, label: string): ReactNode {
    if (typeof node === 'number') return node
    if (typeof node === 'string') {
      if (!String(node).trim()) return node
      const item = field(path, 'text', label, String(node))
      const value = item.saved && typeof item.saved.text === 'string' ? item.saved.text : node
      return markText ? createElement('cms-text', { key: item.key, 'data-cms-text': item.key, 'data-cms-block': item.key, style: { display: 'contents' } }, value) : value
    }
    if (Array.isArray(node)) return node.map((child, index) => {
      const next = walk(child, `${path}.${index}`, label)
      return isValidElement(next) && next.key == null ? cloneElement(next, { key: `${path}.${index}` }) : next
    })
    if (!isValidElement(node)) return node
    const element = node as ReactElement<Record<string, unknown>>
    const original = element.props
    if (typeof original.className === 'string' && original.className.split(/\s+/).includes('site-header__subrow')) return node
    // Another connected block owns its own fields and paths.
    if (original.cmsBlockKey || original['data-cms-content-root'] || original['data-cms-content-connected']) return node
    const tag = typeof element.type === 'string' ? element.type : ''
    if (['svg', 'script', 'style', 'noscript', 'input', 'select', 'textarea'].includes(tag)) return node
    const props: Record<string, unknown> = {}
    let marker = ''
    if (typeof original.href === 'string' && !original.href.startsWith('#')) {
      const item = field(`${path}.href`, 'link', 'Ссылка', original.href)
      if (typeof item.saved?.href === 'string') props.href = item.saved.href
      marker = item.key
      if (markText) props['data-cms-link'] = item.key
    }
    const source = typeof original.src === 'string' ? original.src : original.src && typeof original.src === 'object' && 'src' in original.src ? String(original.src.src) : ''
    if (source && !source.startsWith('data:')) {
      const video = ['video', 'audio', 'source', 'iframe'].includes(tag) || !/\.(png|jpe?g|gif|webp|avif|svg)(?:[?#]|$)|\/_next\/image\?/i.test(source)
      const item = field(`${path}${video ? '.href' : '.image'}`, video ? 'link' : 'image', video ? 'Видео' : typeof original.alt === 'string' && original.alt ? `Изображение: ${original.alt}` : 'Изображение', source)
      if (video && typeof item.saved?.href === 'string') props.src = item.saved.href
      if (item.saved?.image) {
        props.src = item.saved.image
        if (tag === 'img') props.srcSet = undefined
        if (!original.fill && original.src && typeof original.src === 'object') {
          if (!original.width && 'width' in original.src) props.width = original.src.width
          if (!original.height && 'height' in original.src) props.height = original.src.height
        }
      }
      marker = item.key
      if (markText) props[video ? 'data-cms-video' : 'data-cms-image'] = item.key
    }
    if (typeof original.poster === 'string') {
      const item = field(`${path}.poster.image`, 'image', 'Обложка видео', original.poster)
      if (item.saved?.image) props.poster = item.saved.image
      if (markText) props['data-cms-poster'] = item.key
    }
    if (typeof original.srcMobile === 'string' && original.srcMobile) {
      const item = field(`${path}.mobile.image`, 'image', 'Мобильное изображение', original.srcMobile)
      if (item.saved?.image) props.srcMobile = item.saved.image
    }
    if (typeof original.embedSrc === 'string') {
      const item = field(`${path}.embed.href`, 'link', 'Ссылка на видео', original.embedSrc)
      if (typeof item.saved?.href === 'string') props.embedSrc = item.saved.href
    }
    if (!tag) for (const name of textProps) {
      if (typeof original[name] !== 'string' || !String(original[name]).trim()) continue
      const item = field(`${path}.prop.${name}`, 'text', labels[name] || 'Текст', String(original[name]))
      if (typeof item.saved?.text === 'string') props[name] = item.saved.text
      marker ||= item.key
    }
    if (!tag) for (const name of dataProps) if (name in original) props[name] = data(original[name], `${path}.prop.${name}`, name)
    const childLabel = /^h[1-6]$/.test(tag) ? 'Заголовок' : tag === 'button' || tag === 'a' ? 'Надпись' : tag === 'li' ? 'Пункт' : 'Текст'
    if ('children' in original) {
      const before = fields.length
      props.children = walk(original.children as ReactNode, `${path}.children`, childLabel)
      marker ||= fields[before]?.key || ''
    }
    if (tag && marker && !original['data-cms-block']) props['data-cms-block'] = marker
    return cloneElement(element, props)
  }
  return { content: walk(children, '0', 'Текст'), fields }
}

export function bindMarkedContent(children: ReactNode, parts: readonly ContentPart[]): ReactNode {
  const values = new Map(parts.map(part => [part.key, part]))
  const walk = (node: ReactNode): ReactNode => {
    if (Array.isArray(node)) return node.map((child, index) => {
      const next = walk(child)
      return isValidElement(next) && next.key == null ? cloneElement(next, { key: index }) : next
    })
    if (!isValidElement(node)) return node
    const element = node as ReactElement<Record<string, unknown>>
    const props: Record<string, unknown> = {}
    const text = values.get(String(element.props['data-cms-text'] || ''))
    const image = values.get(String(element.props['data-cms-image'] || ''))
    const link = values.get(String(element.props['data-cms-link'] || ''))
    const video = values.get(String(element.props['data-cms-video'] || ''))
    const poster = values.get(String(element.props['data-cms-poster'] || ''))
    if (image?.image) { props.src = image.image; props.srcSet = undefined }
    if (typeof link?.href === 'string') props.href = link.href
    if (typeof video?.href === 'string') props.src = video.href
    if (poster?.image) props.poster = poster.image
    if (text && typeof text.text === 'string') props.children = text.text
    else if ('children' in element.props) props.children = walk(element.props.children as ReactNode)
    return cloneElement(element, props)
  }
  return walk(children)
}
