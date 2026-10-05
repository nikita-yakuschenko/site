'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { IconArrowLeft, IconArrowRight } from '@tabler/icons-react'

export function AboutTimeline({ children }: { children: ReactNode }) {
  const rail = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ start: true, end: false })

  useEffect(() => {
    const element = rail.current
    if (!element) return
    const update = () => {
      const start = element.scrollLeft < 2
      const end = element.scrollLeft + element.clientWidth >= element.scrollWidth - 2
      element.dataset.start = String(start)
      element.dataset.end = String(end)
      setEdges(previous => previous.start === start && previous.end === end ? previous : { start, end })
    }
    let frame = 0
    let target = element.scrollLeft
    let lastTime = 0
    const stop = () => { cancelAnimationFrame(frame); frame = 0; lastTime = 0 }
    const tick = (time: number) => {
      const delta = lastTime ? Math.min(time - lastTime, 40) : 16
      lastTime = time
      const distance = target - element.scrollLeft
      element.scrollLeft += distance * (1 - Math.exp(-delta / 110))
      if (Math.abs(distance) > 6) frame = requestAnimationFrame(tick)
      else { element.scrollLeft = target; stop() }
    }
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY) || !event.deltaY) return
      const maximum = element.scrollWidth - element.clientWidth
      if (maximum <= 0) return
      if (!frame) target = element.scrollLeft
      const down = event.deltaY > 0
      // Release the page only once the visible timeline reaches its boundary.
      if ((down && element.scrollLeft >= maximum - 2) || (!down && element.scrollLeft <= 2)) {
        stop()
        return
      }
      event.preventDefault()
      // One movement lands on a milestone, not an arbitrary pixel offset.
      if (frame) return
      const step = element.querySelector('li')?.getBoundingClientRect().width ?? element.clientWidth
      const index = down ? Math.floor((element.scrollLeft + 2) / step) + 1 : Math.ceil((element.scrollLeft - 2) / step) - 1
      target = Math.max(0, Math.min(maximum, index * step))
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        stop()
        element.scrollLeft = target
      } else if (!frame) frame = requestAnimationFrame(tick)
    }
    update()
    element.addEventListener('scroll', update, { passive: true })
    element.addEventListener('keydown', stop)
    const section = element.closest('section') ?? element
    section.addEventListener('wheel', wheel as EventListener, { passive: false })
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => {
      stop()
      element.removeEventListener('scroll', update)
      element.removeEventListener('keydown', stop)
      section.removeEventListener('wheel', wheel as EventListener)
      observer.disconnect()
    }
  }, [])

  function move(direction: number) {
    const element = rail.current
    if (!element) return
    const step = element.querySelector('li')?.getBoundingClientRect().width ?? element.clientWidth
    const index = direction > 0 ? Math.floor((element.scrollLeft + 2) / step) + 1 : Math.ceil((element.scrollLeft - 2) / step) - 1
    element.scrollTo({ left: Math.max(0, Math.min(element.scrollWidth - element.clientWidth, index * step)), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  }

  return (
    <>
      <div className="about-timeline__heading">
        <h2 id="about-history">История компании</h2>
        <div className="about-timeline__controls">
          <button type="button" aria-label="Предыдущие годы" aria-controls="about-history-rail" disabled={edges.start} onClick={() => move(-1)}><IconArrowLeft size={18} stroke={2} aria-hidden /></button>
          <button type="button" aria-label="Следующие годы" aria-controls="about-history-rail" disabled={edges.end} onClick={() => move(1)}><IconArrowRight size={18} stroke={2} aria-hidden /></button>
        </div>
      </div>
      <div ref={rail} id="about-history-rail" className="about-timeline__rail" tabIndex={0} role="region" aria-labelledby="about-history">{children}</div>
    </>
  )
}
