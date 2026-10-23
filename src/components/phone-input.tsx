'use client'

import { useEffect, useRef, type ComponentPropsWithRef } from 'react'
import { caretAfterNationalDigits, maskPhone, nationalDigitsBeforeCaret, nationalPhoneDigits } from '../lib/phone'

type Props = Omit<ComponentPropsWithRef<'input'>, 'value' | 'onChange' | 'onKeyDown' | 'onFocus'> & {
  value: string
  onValueChange: (value: string) => void
  onEdited?: () => void
}

/** Keep the native input (and its geometry, selection and accessible name).
 * A temporary, non-interactive text layer explains country-code normalization.
 * The actual value never waits for that layer's animation. */
export function PhoneInput({ value, onValueChange, onEdited, ref, ...props }: Props) {
  const feedback = useRef<{ node: HTMLElement; animations: Animation[]; input: HTMLInputElement; color: string; caretColor: string } | null>(null)
  const typedPlus = useRef(false)

  function clearFeedback() {
    const current = feedback.current
    feedback.current = null
    current?.animations.forEach(animation => animation.cancel())
    current?.node.remove()
    if (current) {
      current.input.style.color = current.color
      current.input.style.caretColor = current.caretColor
    }
  }

  useEffect(() => {
    const clear = () => clearFeedback()
    window.addEventListener('scroll', clear, true)
    window.addEventListener('resize', clear)
    return () => {
      window.removeEventListener('scroll', clear, true)
      window.removeEventListener('resize', clear)
      clearFeedback()
    }
  }, [])

  function respond(input: HTMLInputElement, typed: string, text: string) {
    clearFeedback()
    const style = getComputedStyle(input)
    const rect = input.getBoundingClientRect()
    const layer = document.createElement('span')
    layer.className = 'phone-input-feedback ym-hide-content'
    layer.setAttribute('aria-hidden', 'true')
    const left = rect.left + parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft) - input.scrollLeft
    Object.assign(layer.style, {
      position: 'fixed', left: `${left}px`, top: `${rect.top + parseFloat(style.borderTopWidth)}px`,
      height: `${input.clientHeight}px`, display: 'inline-grid', alignItems: 'center',
      font: style.font, letterSpacing: style.letterSpacing, color: style.color,
      pointerEvents: 'none', whiteSpace: 'pre', zIndex: '2147483647',
    })
    const next = document.createElement('span')
    next.style.gridArea = '1 / 1'
    layer.append(next)
    // A native dialog is in the top layer, above even the highest body z-index.
    ;(input.closest('dialog[open]') || document.body).append(layer)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const duration = reduced ? 120 : 280
    const easing = getComputedStyle(document.documentElement).getPropertyValue('--ease-out').trim() || 'cubic-bezier(0.23, 1, 0.32, 1)'
    const animations: Animation[] = []
    const converting = typed === '8' || typed === '7'
    if (converting) {
      const previous = document.createElement('span')
      previous.textContent = typed
      previous.style.gridArea = '1 / 1'
      layer.append(previous)
      animations.push(previous.animate([
        { opacity: 1, offset: 0 },
        { opacity: 1, offset: 0.24 },
        { opacity: 0, offset: 0.4 },
        { opacity: 0, offset: 1 },
      ], { duration, fill: 'forwards' }))
    }
    // Clear the old glyph first, then print the new glyphs. There is never
    // a crossfade of two different characters in the same position.
    let order = 0
    for (const [index, character] of [...text].entries()) {
      const glyph = document.createElement('span')
      glyph.textContent = character
      glyph.style.display = 'inline-block'
      next.append(glyph)
      const active = character !== ' ' && (typed === '+' ? index === 0 : typed === 'confirmed7' ? index === 1 : true)
      if (!active) continue
      const start = (converting ? 0.48 : 0.25) + order++ * 0.07
      const lifted = reduced ? 'none' : 'translateY(0.18em)'
      animations.push(glyph.animate([
        { opacity: 0, transform: lifted, offset: 0 },
        { opacity: 0, transform: lifted, offset: start, easing },
        { opacity: 1, transform: 'none', offset: 1 },
      ], { duration, fill: 'forwards' }))
    }
    const current = { node: layer, animations, input, color: input.style.color, caretColor: input.style.caretColor }
    input.style.caretColor = style.color
    input.style.color = 'transparent'
    feedback.current = current
    void Promise.all(animations.map(animation => animation.finished)).then(() => {
      if (feedback.current === current) clearFeedback()
    }).catch(() => { /* A new keystroke superseded this feedback. */ })
  }

  return <input {...props} ref={ref} type="tel" inputMode="tel" value={value}
    onBlur={event => { typedPlus.current = false; clearFeedback(); props.onBlur?.(event) }}
    onChange={event => {
      const input = event.currentTarget
      const raw = input.value
      const native = event.nativeEvent as InputEvent
      const inserted = native.data ?? (raw.length > value.length ? raw.slice(input.selectionStart! - (raw.length - value.length), input.selectionStart!) : '')
      const starting = !nationalPhoneDigits(value)
      const prefix = starting && /^[+78]$/.test(inserted)
      const masked = !raw ? '' : raw === '+' || (prefix && inserted === '+') ? '+' : prefix ? '+7' : maskPhone(raw)
      const digits = prefix ? 0 : nationalDigitsBeforeCaret(raw, input.selectionStart ?? raw.length)
      clearFeedback()
      onValueChange(masked)
      onEdited?.()
      // Restore immediately even when React's state value remains '+7'.
      input.value = masked
      const caret = masked.length < 2 ? masked.length : caretAfterNationalDigits(masked, digits)
      input.setSelectionRange(caret, caret)
      if (starting && /^[+789]$/.test(inserted)) {
        respond(input, inserted === '7' && typedPlus.current ? 'confirmed7' : inserted, masked)
      }
      typedPlus.current = starting && inserted === '+'
    }}
  />
}
