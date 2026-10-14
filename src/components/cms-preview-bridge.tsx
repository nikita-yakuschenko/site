'use client'

import { useEffect } from 'react'

export function CMSPreviewBridge() {
  useEffect(() => {
    if (window.parent === window || !new URLSearchParams(window.location.search).has('cmsPreview')) return
    const allowed = new Set(['http://localhost:3001', 'https://cms.avgst.ru'])
    const hidden = new Set<Element>()
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
      const hide = (element: Element) => { element.setAttribute('data-cms-preview-hidden', ''); hidden.add(element) }
      if (target && event.data.dim) {
        // The block is one section. The rest of the page is other blocks, so it stays out of this preview.
        let box = target
        if (box instanceof HTMLElement && getComputedStyle(box).display === 'contents') box = [...box.children].find(child => !['SCRIPT', 'STYLE', 'LINK'].includes(child.tagName)) ?? box
        const anchors = [box]
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
    return () => { restore(); style.remove(); window.removeEventListener('message', receive) }
  }, [])
  return null
}
