'use client'

import type { ReactNode } from 'react'

/**
 * Переход к разделу этой же страницы.
 *
 * Не якорная ссылка: адрес не обрастает решёткой, история не засоряется
 * записями вида /family-mortgage#mortgage-calc, и назад по кнопке браузера
 * человек уходит откуда пришёл, а не прыгает по собственным нажатиям.
 * Это перемещение взгляда внутри страницы, а не навигация.
 *
 * Глобально scroll-behavior: smooth ставить нельзя — в styles.css записано,
 * почему: при client-переходе (футер → длинная страница) браузер
 * анимирует прокрутку от низа к верху через весь документ. Поэтому
 * плавность включается точечно.
 *
 * При prefers-reduced-motion прокрутка мгновенная.
 */
export function ScrollTo({
  target,
  className,
  children,
}: {
  /** id раздела, к которому нужно перейти. */
  target: string
  className?: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        const node = document.getElementById(target)
        if (!node) return
        const reduced = window.matchMedia(
          '(prefers-reduced-motion: reduce)',
        ).matches
        node.scrollIntoView({
          behavior: reduced ? 'auto' : 'smooth',
          block: 'start',
        })
        /* Фокус уводится в раздел, иначе с клавиатуры человек остаётся
           наверху и следующий Tab возвращает его к тому, что он уже
           миновал. tabIndex -1 — чтобы раздел не попадал в обход сам. */
        node.setAttribute('tabindex', '-1')
        node.focus({ preventScroll: true })
      }}
    >
      {children}
    </button>
  )
}
