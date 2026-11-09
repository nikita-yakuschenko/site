'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { IconArrowUpRight, IconX } from '@tabler/icons-react'
import { TECHNOLOGY_OPTIONS } from '../lib/catalog/types'
import { copy } from '../lib/copy'
import { LeadDialog } from './lead-dialog'

const prefab = {
  src: '/logos/AS%20PREFAB.svg',
  alt: 'AS PREFAB',
  lines: [
    'На\u00A0заводе собираем модули с\u00A0отделкой,',
    'коммуникациями и\u00A0электрикой внутри.',
    'На\u00A0участке собираем из\u00A0них готовый дом.',
    'Приезжайте — всё покажем и\u00A0расскажем.',
  ],
}
const preCut = {
  src: '/logos/AS%20Pre-Cut.svg',
  alt: 'AS PRECUT',
  lines: [
    'На\u00A0заводе готовим все детали каркаса,',
    'и\u00A0каждый элемент уже готов к\u00A0сборке.',
    'Приезжайте на\u00A0экскурсию — покажем,',
    'как устроен весь процесс производства.',
  ],
}

const CLOSE_DELAY = 5000

export function ProjectTechnology({ badge, project }: { badge: string; project: string }) {
  const [phase, setPhase] = useState<'closed' | 'hover' | 'pinned' | 'closing'>('closed')
  const [booking, setBooking] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const popover = useRef<HTMLDivElement>(null)
  const close = useRef<HTMLButtonElement>(null)
  const timer = useRef<number | null>(null)
  const inside = useRef(false)
  const mode = useRef<'hover' | 'pinned' | null>(null)
  const technology = TECHNOLOGY_OPTIONS.find(option => option.value === badge)?.technology
  const logo = technology === 'frame' ? preCut : prefab
  const shown = phase === 'hover' || phase === 'pinned'

  const clearTimer = () => {
    if (timer.current === null) return
    window.clearTimeout(timer.current)
    timer.current = null
  }

  const dismiss = () => {
    clearTimer()
    mode.current = null
    setPhase(current => {
      if (current !== 'hover' && current !== 'pinned') return current
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      return reduce ? 'closed' : 'closing'
    })
  }

  const pin = () => {
    clearTimer()
    mode.current = 'pinned'
    setPhase('pinned')
  }

  useEffect(() => {
    const node = root.current
    if (!node) return
    const onEnter = () => {
      if (mode.current === 'pinned') return
      mode.current = 'hover'
      setPhase(current => current === 'pinned' ? current : 'hover')
    }
    const onLeave = () => {
      if (mode.current !== 'hover') return
      mode.current = null
      setPhase(current => {
        if (current !== 'hover') return current
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        return reduce ? 'closed' : 'closing'
      })
    }
    node.addEventListener('pointerenter', onEnter)
    node.addEventListener('pointerleave', onLeave)
    return () => {
      node.removeEventListener('pointerenter', onEnter)
      node.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  useEffect(() => {
    if (phase !== 'hover' && phase !== 'pinned') return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') dismiss() }
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) dismiss()
    }
    const onScroll = () => dismiss()
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [phase])

  useEffect(() => {
    if (phase !== 'pinned') return
    close.current?.focus({ preventScroll: true })
    inside.current = popover.current?.matches(':hover') ?? false
    const arm = () => {
      clearTimer()
      if (inside.current) return
      timer.current = window.setTimeout(() => {
        mode.current = null
        setPhase(current => {
          if (current !== 'pinned') return current
          const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
          return reduce ? 'closed' : 'closing'
        })
      }, CLOSE_DELAY)
    }
    const onEnter = () => {
      inside.current = true
      clearTimer()
    }
    const onLeave = () => {
      inside.current = false
      arm()
    }
    const node = popover.current
    node?.addEventListener('pointerenter', onEnter)
    node?.addEventListener('pointerleave', onLeave)
    arm()
    return () => {
      clearTimer()
      node?.removeEventListener('pointerenter', onEnter)
      node?.removeEventListener('pointerleave', onLeave)
    }
  }, [phase])

  useEffect(() => {
    if (phase !== 'closing') return
    const fallback = window.setTimeout(() => setPhase('closed'), 280)
    return () => window.clearTimeout(fallback)
  }, [phase])

  if (!technology) return <p className="project-hero__badge">{badge}</p>

  return <>
    <div className="project-hero__technology" ref={root}>
      <button type="button" className="project-hero__badge" aria-expanded={shown} onPointerDown={event => { if (event.button !== 0) return; mode.current === 'pinned' ? dismiss() : pin() }} onClick={event => { if (event.detail !== 0) return; mode.current === 'pinned' ? dismiss() : pin() }}>{badge}</button>
      <button type="button" className="project-hero__badge" aria-expanded={shown} onPointerDown={event => { if (event.button !== 0) return; mode.current === 'pinned' ? dismiss() : pin() }} onClick={event => { if (event.detail !== 0) return; mode.current === 'pinned' ? dismiss() : pin() }}>
        <Image src={logo.src} alt={logo.alt} className="project-hero__technology-logo" width={435} height={76} unoptimized />
      </button>
      {phase !== 'closed' ? <div ref={popover} className="technology-popover" data-closing={phase === 'closing' ? '' : undefined} role="dialog" aria-modal="false" aria-label={logo.alt} onPointerDown={event => { if (event.button === 0 && mode.current !== 'pinned') pin() }} onAnimationEnd={event => { if (event.target === event.currentTarget && phase === 'closing') setPhase('closed') }}>
        <button ref={close} type="button" className="ask-dialog__close" aria-label={copy.close} onClick={dismiss}>
          <IconX size={18} stroke={2.2} />
        </button>
        <div className="technology-dialog__intro">
          <Image src={logo.src} alt="" width={435} height={76} className="technology-dialog__logo" unoptimized />
          <p>{logo.lines.map((line, index) => <span key={line}>{index > 0 ? <br /> : null}{line}{index < logo.lines.length - 1 ? ' ' : null}</span>)}</p>
          <button type="button" className="btn btn-yellow" onClick={() => { dismiss(); setBooking(true) }}>
            Посетить производство <IconArrowUpRight size={18} stroke={2} aria-hidden="true" />
          </button>
        </div>
      </div> : null}
    </div>
    {booking ? <LeadDialog formId="factory-tour" heading={copy.factoryTour} submitLabel={copy.factoryTour}
      body="Оставьте контакты, мы свяжемся и согласуем удобное время."
      meta={{ projectName: project }} onClose={() => setBooking(false)} /> : null}
  </>
}
