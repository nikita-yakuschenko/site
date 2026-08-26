'use client'

import { useEffect } from 'react'

const svg = (paths: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`

const iconShow = svg(
  '<path d="M10 12a2 2 0 1 0 4 0a2 2 0 0 0 -4 0"/><path d="M21 12c-2.4 4 -5.4 6 -9 6c-3.6 0 -6.6 -2 -9 -6c2.4 -4 5.4 -6 9 -6c3.6 0 6.6 2 9 6"/>',
)

const iconHide = svg(
  '<path d="M10.585 10.587a2 2 0 0 0 2.829 2.828"/><path d="M16.681 16.673a8.717 8.717 0 0 1 -4.681 1.327c-3.6 0 -6.6 -2 -9 -6c1.272 -2.12 2.712 -3.678 4.32 -4.674m2.86 -1.146a9.055 9.055 0 0 1 1.82 -.18c3.6 0 6.6 2 9 6c-.666 1.11 -1.379 2.067 -2.138 2.87"/><path d="M3 3l18 18"/>',
)

export function AdminPasswordToggle() {
  useEffect(() => {
    const enhance = (input: HTMLInputElement) => {
      const parent = input.parentElement
      if (!parent || parent.querySelector(':scope > .avgst-password-toggle')) return

      input.dataset.avgstPassword = '1'
      parent.classList.add('avgst-password-field')

      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'avgst-password-toggle'
      button.setAttribute('aria-label', 'Показать пароль')
      button.innerHTML = iconShow
      button.addEventListener('click', (event) => {
        event.preventDefault()
        const show = input.type === 'password'
        input.type = show ? 'text' : 'password'
        button.setAttribute('aria-label', show ? 'Скрыть пароль' : 'Показать пароль')
        button.innerHTML = show ? iconHide : iconShow
      })
      input.after(button)
    }

    const scan = () => {
      document
        .querySelectorAll<HTMLInputElement>('input[type="password"], input[data-avgst-password="1"]')
        .forEach(enhance)
    }

    scan()
    const observer = new MutationObserver(scan)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])

  return null
}
