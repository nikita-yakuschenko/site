'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import { IconArrowUpRight, IconEdit } from '@tabler/icons-react'
import { Dialog, DialogTrigger } from './ui/dialog'
import type { PlanRequestContext } from '../lib/plan-request'
import './plan-request.css'

const PlanRequestDialog = dynamic(() => import('./plan-request-dialog').then(module => module.PlanRequestDialog), { ssr: false })

export function PlanRequestEntry({ context }: { context: PlanRequestContext }) {
  const entry = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [started, setStarted] = useState(false)
  const [captured, setCaptured] = useState(context)
  useEffect(() => {
    let notice: HTMLElement | null = null
    const measure = () => {
      const node = entry.current
      if (!node) return
      const next = document.querySelector<HTMLElement>('.cookie-banner')
      if (next !== notice) { if (notice) resize.unobserve(notice); notice = next; if (notice) resize.observe(notice) }
      const box = notice?.getBoundingClientRect(), own = node.getBoundingClientRect()
      const overlaps = box && box.height > 0 && box.left < own.right && box.right > own.left && getComputedStyle(notice!).position === 'fixed'
      node.style.setProperty('--plan-fixed-inset', `${overlaps ? Math.max(0, innerHeight - box.top + 16) : 0}px`)
    }
    const resize = new ResizeObserver(measure)
    const mutations = new MutationObserver(measure)
    mutations.observe(document.body, { childList: true, subtree: true })
    window.addEventListener('resize', measure)
    measure()
    return () => { resize.disconnect(); mutations.disconnect(); window.removeEventListener('resize', measure) }
  }, [])
  return <div className="plan-request-entry" ref={entry}>
    <div className="plan-request-entry__copy"><strong>Хотите другую планировку?</strong><p>Расскажите, что для вас важно. Мы подберём проект или предложим решение под ваши пожелания.</p></div>
    <Dialog open={open} onOpenChange={value => {
      if (value && !started) { setCaptured({ ...context, sourcePath: window.location.pathname }); setStarted(true) }
      setOpen(value)
    }}>
      <DialogTrigger asChild><button type="button" className="btn btn-yellow plan-request-entry__button"><IconEdit size={20} aria-hidden="true" /><span>Предложить свою планировку</span><IconArrowUpRight size={18} aria-hidden="true" /></button></DialogTrigger>
      {started && <PlanRequestDialog context={captured} open={open} onReset={() => setCaptured({ ...context, sourcePath: window.location.pathname })} />}
    </Dialog>
  </div>
}
