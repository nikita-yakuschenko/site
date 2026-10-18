'use client'

import { useEffect } from 'react'

export function CMSPreviewBridge() {
  useEffect(() => {
    if (window.parent === window || !new URLSearchParams(window.location.search).has('cmsPreview')) return
    const allowed = new Set(['http://localhost:3001', 'https://cms.avgst.ru'])
    const hidden = new Set<Element>()
    let pending: MessageEvent | null = null
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    let retryUntil = 0
    const style = document.createElement('style')
    style.textContent = '[data-cms-preview-hidden]{display:none!important}[data-cms-preview-path]{transform:none!important}header[data-cms-preview-path]{position:relative!important}html[data-cms-preview-isolated] body{overflow:auto!important}'
    document.head.append(style)
    const restore = () => {
      hidden.forEach(element => element.removeAttribute('data-cms-preview-hidden'))
      hidden.clear()
      document.querySelectorAll('[data-cms-preview-path]').forEach(element => element.removeAttribute('data-cms-preview-path'))
      document.documentElement.removeAttribute('data-cms-preview-isolated')
    }
    const receive = (event: MessageEvent) => {
      if (event.source !== window.parent || !allowed.has(event.origin)) return
      if (event.data?.type === 'avgst:preview-order') {
        const keys = ['ProjectExteriors', 'ProjectPlans', 'ProjectInteriors', 'ProjectBuilt', 'MortgageCalculator', 'ProjectConfig', 'ReadyHomeOffer', 'ProjectNextSteps', 'ProjectSimilar', 'contactsSection']
        const requested = event.data.order
        const order = Array.isArray(requested) ? [...requested.filter(key => key !== 'contactsSection'), 'contactsSection'] : requested
        if (!Array.isArray(order) || order.length !== keys.length || new Set(order).size !== order.length || !order.every(key => keys.includes(key))) return
        for (const element of document.querySelectorAll<HTMLElement>('[data-cms-block]')) {
          const index = order.indexOf(element.dataset.cmsBlock)
          const main = element.closest('main')
          if (index < 0 || !main) continue
          let block = element
          while (block.parentElement && block.parentElement !== main) block = block.parentElement
          block.style.order = String(index)
        }
        return
      }
      if (event.data?.type !== 'avgst:preview-block') return
      restore()
      const key = event.data.key
      if (typeof key !== 'string' && key !== null) return
      let target: Element | undefined
      if (key) target = [...document.querySelectorAll('[data-cms-block]')].find(element => (element.childElementCount > 0 || element.textContent?.trim()) && (element.getAttribute('data-cms-block') === key || (key === 'leadForm' && element.getAttribute('data-cms-block') === 'LeadForm')))
      if (!target && typeof key === 'string') {
        const aliases: Record<string, string> = { ProjectHeroContent: 'projectHero', ProjectHeroPayment: 'projectHero', ContactsSection: 'contactsSection', ProjectPreview: 'projectHero' }
        const alias = aliases[key]
        if (alias) target = [...document.querySelectorAll('[data-cms-block]')].find(element => element.getAttribute('data-cms-block') === alias)
      }
      if (!target && typeof key === 'string' && key.includes('.content.')) {
        const blockKey = key.split('.content.')[0]
        target = [...document.querySelectorAll('[data-cms-block]')].find(element => element.getAttribute('data-cms-block') === blockKey)
      }
      if (!target && typeof key === 'string' && /^(Project|ReadyHomeOffer)/.test(key)) {
        target = [...document.querySelectorAll('[data-cms-block]')].find(element => element.getAttribute('data-cms-block') === key.split('.')[0])
      }
      // Streaming pages can mount this bridge before their sections arrive.
      // Wait for the requested markup instead of reporting a missing block early.
      if (key && !target) {
        if (pending?.data?.key !== key) retryUntil = Date.now() + 15000
        pending = event
        if (Date.now() < retryUntil) {
          clearTimeout(retryTimer)
          retryTimer = setTimeout(() => { if (pending) receive(pending) }, 200)
          return
        }
      }
      pending = null
      clearTimeout(retryTimer)
      const hide = (element: Element) => { element.setAttribute('data-cms-preview-hidden', ''); hidden.add(element) }
      if (target && event.data.dim) {
        // The block is one section. The rest of the page is other blocks, so it stays out of this preview.
        const box = target
        const children = [...box.children].filter(child => !['SCRIPT', 'STYLE', 'LINK'].includes(child.tagName))
        const anchors = box instanceof HTMLElement && getComputedStyle(box).display === 'contents' && children.length ? children : [box]
        if (key === 'hero') { const header = document.querySelector('header.site-header'); if (header) anchors.push(header) }
        const walk = (element: Element) => {
          for (const child of element.children) {
            if (['SCRIPT', 'STYLE', 'LINK'].includes(child.tagName)) continue
            if (anchors.some(anchor => child.contains(anchor))) walk(child)
            else if (!anchors.some(anchor => anchor === child || anchor.contains(child))) hide(child)
          }
        }
        walk(document.body)
        document.documentElement.setAttribute('data-cms-preview-isolated', '')
        window.scrollTo(0, 0)
      } else if (target) {
        let current: Element = target
        while (current.parentElement) {
          for (const sibling of current.parentElement.children) if (sibling !== current && !['SCRIPT', 'STYLE', 'LINK'].includes(sibling.tagName)) { sibling.setAttribute('data-cms-preview-hidden', ''); hidden.add(sibling) }
          current = current.parentElement
          current.setAttribute('data-cms-preview-path', '')
          if (current === document.body) break
        }
        document.documentElement.setAttribute('data-cms-preview-isolated', '')
        window.scrollTo(0, 0)
      }
      window.parent.postMessage({ type: 'avgst:preview-block-status', key, found: !key || Boolean(target) }, event.origin)
    }
    window.addEventListener('message', receive)
    window.parent.postMessage({ type: 'avgst:preview-ready' }, '*')
    return () => { clearTimeout(retryTimer); pending = null; restore(); style.remove(); window.removeEventListener('message', receive) }
  }, [])
  return null
}
