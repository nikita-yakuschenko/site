'use client'

import { useEffect } from 'react'

/** Recompute from rendered sections, including unsaved preview ordering. */
export function ProjectSectionTones() {
  useEffect(() => {
    const main = document.querySelector('main[data-project-sections]')
    if (!main) return
    const update = () => {
      const blocks = [...main.querySelectorAll<HTMLElement>(':scope > div[data-cms-block]')].sort((a, b) => Number(a.style.order) - Number(b.style.order))
      let muted = false
      for (const block of blocks) {
        const section = block.querySelector<HTMLElement>(':scope > .section')
        if (!section) { delete block.dataset.sectionTone; continue }
        if (section.classList.contains('section--ink')) {
          block.dataset.sectionTone = 'ink'
          muted = false
        } else {
          block.dataset.sectionTone = muted ? 'muted' : 'plain'
          muted = !muted
        }
      }
    }
    update()
    const observer = new MutationObserver(update)
    observer.observe(main, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] })
    return () => observer.disconnect()
  }, [])
  return null
}
