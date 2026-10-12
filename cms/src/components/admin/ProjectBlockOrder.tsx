'use client'
import { useField } from '@payloadcms/ui'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { JSONFieldClientProps } from 'payload'
import { IconArrowUp, IconArrowDown, IconGripVertical } from '@tabler/icons-react'
import { Button } from '../ui/button'
import { projectBlockOrder, validProjectOrder } from '../../config/project-order'

export function ProjectBlockOrder({ path, readOnly }: JSONFieldClientProps) {
  const { value, setValue } = useField<string[]>({ path })
  const [defaultOrder, setDefaultOrder] = useState(projectBlockOrder)
  const order = validProjectOrder(value) ? value : defaultOrder
  const ref = useRef<HTMLDivElement>(null)
  const [targets, setTargets] = useState<{ key: string; element: Element }[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/projects/page-order?slug=new', { signal: controller.signal }).then(response => response.json()).then(result => { if (validProjectOrder(result.order)) setDefaultOrder(result.order) }).catch(() => {})
    return () => controller.abort()
  }, [])
  useEffect(() => { window.dispatchEvent(new CustomEvent('avgst:preview-order', { detail: order })) }, [order])
  const move = (from: string, to: string) => {
    if (readOnly || from === to) return
    const next = [...order]
    const index = next.indexOf(from)
    const target = next.indexOf(to)
    if (index < 0 || target < 0) return
    next.splice(index, 1); next.splice(target, 0, from); setValue(next)
  }
  useEffect(() => {
    const root = ref.current?.closest('.document-fields__fields')
    if (!root) return
    const cleanups: (() => void)[] = []
    const refresh = () => {
      cleanups.splice(0).forEach(cleanup => cleanup())
      const found: typeof targets = []
      for (const key of ['projectHero', ...order]) {
        const section = root.querySelector<HTMLElement>(`.project-order-section-${key}`)
        if (!section) continue
        section.style.order = String(key === 'projectHero' ? 1 : order.indexOf(key) + 2)
        section.parentElement?.classList.add('project-ordered-fields')
        if (key === 'projectHero') continue
        const header = section.querySelector<HTMLElement>('.collapsible__toggle-wrap')
        const actions = section.querySelector('.collapsible__actions-wrap')
        if (actions) found.push({ key, element: actions })
        if (!header || readOnly) continue
        header.draggable = true
        const start = (event: DragEvent) => { event.dataTransfer?.setData('application/x-cms-block', key); if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move' }
        const over = (event: DragEvent) => { if (event.dataTransfer?.types.includes('application/x-cms-block')) event.preventDefault() }
        const drop = (event: DragEvent) => { const from = event.dataTransfer?.getData('application/x-cms-block'); if (from) { event.preventDefault(); move(from, key) } }
        header.addEventListener('dragstart', start); header.addEventListener('dragover', over); header.addEventListener('drop', drop)
        cleanups.push(() => { header.draggable = false; header.removeEventListener('dragstart', start); header.removeEventListener('dragover', over); header.removeEventListener('drop', drop) })
      }
      setTargets(previous => previous.length === found.length && previous.every((item, i) => item.element === found[i].element && item.key === found[i].key) ? previous : found)
    }
    refresh()
    const observer = new MutationObserver(refresh)
    observer.observe(root, { childList: true, subtree: true })
    return () => { observer.disconnect(); cleanups.forEach(cleanup => cleanup()) }
  // The handlers must capture the current field order.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, defaultOrder, readOnly])
  const applyAll = async () => {
    setBusy(true); setMessage('')
    try {
      const response = await fetch('/api/projects/apply-order-to-all', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Не удалось сохранить')
      setValue([...order]); setMessage(`Применено ко всем: ${result.updated}`)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Ошибка сохранения') }
    finally { setBusy(false) }
  }
  const visible = targets.map(target => target.key)
  return <div ref={ref} className="shadcn-surface project-order-toolbar"><Button type="button" variant="outline" size="sm" disabled={readOnly || busy} onClick={applyAll}>{busy ? 'Применяется…' : 'Применить порядок ко всем'}</Button>{message && <span role="status" className="text-sm text-muted-foreground">{message}</span>}{targets.map(({ key, element }) => createPortal(<span className="project-order-actions" onClick={event => event.stopPropagation()}><IconGripVertical className="size-4 text-muted-foreground" aria-hidden="true" /><Button type="button" variant="ghost" size="icon" className="size-7" aria-label="Переместить блок выше" disabled={readOnly || visible.indexOf(key) === 0} onClick={() => move(key, visible[visible.indexOf(key) - 1])}><IconArrowUp className="size-4" /></Button><Button type="button" variant="ghost" size="icon" className="size-7" aria-label="Переместить блок ниже" disabled={readOnly || visible.indexOf(key) === visible.length - 1} onClick={() => move(key, visible[visible.indexOf(key) + 1])}><IconArrowDown className="size-4" /></Button></span>, element, key))}</div>
}
