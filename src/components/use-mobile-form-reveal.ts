'use client'

import { useLayoutEffect, type RefObject } from 'react'

export const isMobileFormViewport = () => window.matchMedia('(max-width: 767px)').matches

export function formScrollDelta(top: number, height: number, safeTop: number, safeBottom: number, finalHeight = height) {
  if (Math.max(height, finalHeight) > safeBottom - safeTop) return top - safeTop
  if (top < safeTop) return top - safeTop
  return Math.max(0, top + height - safeBottom)
}

/** Follow the same layout animation; never focus a field or compete with a gesture. */
export function followMobileForm(element: HTMLElement, duration = 650) {
  if (!isMobileFormViewport()) return () => {}
  const probe = document.createElement('div')
  probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;padding-top:var(--form-safe-top,env(safe-area-inset-top,0px));padding-bottom:var(--form-safe-bottom,env(safe-area-inset-bottom,0px))'
  document.body.append(probe)
  const scrollingRoot = document.documentElement
  const anchoring = scrollingRoot.style.overflowAnchor
  scrollingRoot.style.overflowAnchor = 'none'
  let frame = 0, stopped = false
  let start: number | null = null
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const cancel = () => {
    if (stopped) return
    stopped = true
    cancelAnimationFrame(frame)
    probe.remove()
    scrollingRoot.style.overflowAnchor = anchoring
    for (const type of ['touchstart', 'pointerdown', 'wheel', 'keydown']) window.removeEventListener(type, cancel, true)
  }
  for (const type of ['touchstart', 'pointerdown', 'wheel', 'keydown']) window.addEventListener(type, cancel, { capture: true, passive: true })
  const tick = (now: number) => {
    if (stopped || !element.isConnected || !isMobileFormViewport()) { cancel(); return }
    start ??= now
    const viewport = window.visualViewport
    const style = getComputedStyle(probe)
    const safeTop = (viewport?.offsetTop || 0) + parseFloat(style.paddingTop || '0') + 16
    let safeBottom = (viewport?.offsetTop || 0) + (viewport?.height || window.innerHeight) - parseFloat(style.paddingBottom || '0') - 16
    const rect = element.getBoundingClientRect()
    const notice = document.querySelector<HTMLElement>('.cookie-banner')
    if (notice && getComputedStyle(notice).position === 'fixed' && getComputedStyle(notice).opacity !== '0') {
      const box = notice.getBoundingClientRect()
      if (box.height && box.top > safeTop && box.left < rect.right && box.right > rect.left) safeBottom = Math.min(safeBottom, box.top - 16)
    }
    const content = element.querySelector<HTMLElement>('.panel-lead__form > div, .project-config__mobile-form')
    const delta = formScrollDelta(rect.top, rect.height, safeTop, safeBottom, content?.scrollHeight)
    const final = now - start >= duration
    // Growth already supplies the easing. A short catch-up also covers crossfades.
    const amount = reduced || final ? delta : delta * .3
    if (Math.abs(amount) > .5) {
      let parent = element.parentElement
      while (parent && !(parent.scrollHeight > parent.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(parent).overflowY))) parent = parent.parentElement
      if (parent && parent !== document.body && parent !== document.documentElement) parent.scrollBy({ top: amount, behavior: 'instant' })
      else window.scrollBy({ top: amount, behavior: 'instant' })
    }
    if (final) cancel()
    else frame = requestAnimationFrame(tick)
  }
  frame = requestAnimationFrame(tick)
  return cancel
}

export function useMobileFormReveal(open: boolean, ref: RefObject<HTMLElement | null>, selector?: string) {
  useLayoutEffect(() => {
    if (!open || !ref.current) return
    const element = selector ? ref.current.querySelector<HTMLElement>(selector) : ref.current
    if (element) return followMobileForm(element)
  }, [open, ref, selector])
}
