'use client'
import { useField } from '@payloadcms/ui'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { JSONFieldClientProps } from 'payload'
import { IconArrowUp, IconArrowDown, IconGripVertical } from '@tabler/icons-react'
import { Button } from '../ui/button'
import { projectBlockOrder, validProjectOrder, normalizeProjectOrder } from '../../config/project-order'

export function ProjectBlockOrder({ path, readOnly }: JSONFieldClientProps) {
  const { value, setValue } = useField<string[]>({ path })
  const [defaultOrder, setDefaultOrder] = useState(projectBlockOrder)
  const order = normalizeProjectOrder(value ?? defaultOrder)
  const ref = useRef<HTMLDivElement>(null)
  const [targets, setTargets] = useState<{ key: string; element: Element }[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const positions = useRef(new Map<HTMLElement, number>())
  const animations = useRef(new Map<HTMLElement, Animation>())
  const clearDrag = () => document.querySelectorAll('[data-project-drop], .project-block-dragging').forEach(element => { element.removeAttribute('data-project-drop'); element.classList.remove('project-block-dragging') })
  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/projects/page-order?slug=new', { signal: controller.signal }).then(response => response.json()).then(result => { if (validProjectOrder(result.order)) setDefaultOrder(result.order) }).catch(() => {})
    return () => controller.abort()
  }, [])
  useEffect(() => { window.dispatchEvent(new CustomEvent('avgst:preview-order', { detail: order })) }, [value, defaultOrder]) // eslint-disable-line react-hooks/exhaustive-deps
  const move = (from: string, to: string, after = false, animate = true) => {
    if (readOnly || from === to || from === 'contactsSection' || (to === 'contactsSection' && after)) return
    const next = order.filter(key => key !== from)
    const target = next.indexOf(to)
    if (!order.includes(from) || target < 0) return
    next.splice(target + Number(after), 0, from)
    if (next.every((key, index) => key === order[index])) return
    positions.current.clear()
    if (animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      ref.current?.closest('.document-fields__fields')?.querySelectorAll<HTMLElement>('[class*="project-order-section-"]').forEach(element => positions.current.set(element, element.getBoundingClientRect().top))
    }
    animations.current.forEach(animation => animation.cancel())
    animations.current.clear()
    clearDrag()
    setValue(normalizeProjectOrder(next))
  }
  useLayoutEffect(() => {
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
        // Prices are admin-only; they share the configurations slot and follow it in DOM order.
        const prices = key === 'ProjectConfig' ? root.querySelector<HTMLElement>('.project-prices-section') : null
        if (prices) prices.style.order = section.style.order
        section.parentElement?.classList.add('project-ordered-fields')
        if (key === 'projectHero') continue
        const header = section.querySelector<HTMLElement>('.collapsible__toggle-wrap')
        const actions = section.querySelector('.collapsible__actions-wrap')
        if (actions && key !== 'contactsSection') found.push({ key, element: actions })
        if (!header || readOnly) continue
        const over = (event: DragEvent) => {
          if (!event.dataTransfer?.types.includes('application/x-cms-block')) return
          event.preventDefault()
          event.dataTransfer.dropEffect = 'move'
          root.querySelectorAll('[data-project-drop]').forEach(element => element.removeAttribute('data-project-drop'))
          section.dataset.projectDrop = key === 'contactsSection' || event.clientY < header.getBoundingClientRect().top + header.offsetHeight / 2 ? 'before' : 'after'
        }
        const leave = (event: DragEvent) => { if (!(event.relatedTarget instanceof Node) || !header.contains(event.relatedTarget)) section.removeAttribute('data-project-drop') }
        const drop = (event: DragEvent) => {
          const from = event.dataTransfer?.getData('application/x-cms-block')
          if (from) { event.preventDefault(); move(from, key, section.dataset.projectDrop === 'after'); clearDrag() }
        }
        header.addEventListener('dragover', over); header.addEventListener('dragleave', leave); header.addEventListener('drop', drop)
        cleanups.push(() => { header.removeEventListener('dragover', over); header.removeEventListener('dragleave', leave); header.removeEventListener('drop', drop) })
      }
      setTargets(previous => previous.length === found.length && previous.every((item, i) => item.element === found[i].element && item.key === found[i].key) ? previous : found)
    }
    refresh()
    positions.current.forEach((top, element) => {
      const offset = top - element.getBoundingClientRect().top
      if (Math.abs(offset) > 1) animations.current.set(element, element.animate([{ transform: `translateY(${offset}px)` }, { transform: 'translateY(0)' }], { duration: 220, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' }))
    })
    positions.current.clear()
    const observer = new MutationObserver(refresh)
    observer.observe(root, { childList: true, subtree: true })
    return () => { observer.disconnect(); cleanups.forEach(cleanup => cleanup()) }
  // Refresh listeners against the current field order.
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
  return <div ref={ref} className="shadcn-surface project-order-toolbar"><Button type="button" variant="outline" size="sm" disabled={readOnly || busy} onClick={applyAll}>{busy ? 'Применяется…' : 'Применить порядок ко всем'}</Button>{message && <span role="status" className="text-sm text-muted-foreground">{message}</span>}{targets.map(({ key, element }) => createPortal(<span className="project-order-actions" onClick={event => event.stopPropagation()}><button type="button" className="project-order-grip" aria-label="Перетащить блок" disabled={readOnly} draggable={!readOnly} onDragStart={event => { event.stopPropagation(); event.dataTransfer.setData('application/x-cms-block', key); event.dataTransfer.effectAllowed = 'move'; const header = event.currentTarget.closest('.collapsible__toggle-wrap'); if (header instanceof HTMLElement) { const rect = header.getBoundingClientRect(); event.dataTransfer.setDragImage(header, event.clientX - rect.left, event.clientY - rect.top) } event.currentTarget.closest('[class*="project-order-section-"]')?.classList.add('project-block-dragging') }} onDragEnd={clearDrag}><IconGripVertical className="size-4" aria-hidden="true" /></button><Button type="button" variant="ghost" size="icon" className="size-7" aria-label="Переместить блок выше" disabled={readOnly || visible.indexOf(key) === 0} onClick={event => move(key, visible[visible.indexOf(key) - 1], false, event.detail !== 0)}><IconArrowUp className="size-4" /></Button><Button type="button" variant="ghost" size="icon" className="size-7" aria-label="Переместить блок ниже" disabled={readOnly || visible.indexOf(key) === visible.length - 1} onClick={event => move(key, visible[visible.indexOf(key) + 1], true, event.detail !== 0)}><IconArrowDown className="size-4" /></Button></span>, element, key))}</div>
}
