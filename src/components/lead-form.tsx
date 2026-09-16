'use client'

import { useRef, useState } from 'react'
import { IconArrowUpRight } from '@tabler/icons-react'
import { copy } from '../lib/copy'
import {
  caretAfterNationalDigits,
  isValidName,
  isValidRuMobile,
  maskPhone,
  nationalDigitsBeforeCaret,
  nationalPhoneDigits,
  phoneE164,
  sanitizeName,
} from '../lib/phone'

export function LeadForm({
  siteId,
  pageId,
  projectExternalId,
  heading,
  body,
  submitLabel,
  successText,
  variant = 'page',
}: {
  siteId: number | string
  pageId?: number | string
  projectExternalId?: string
  heading: string
  body?: string | null
  submitLabel?: string | null
  successText?: string | null
  variant?: 'page' | 'card'
}) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle')
  const [phone, setPhone] = useState('+7')
  const [invalid, setInvalid] = useState<{
    name?: boolean
    phone?: boolean
    consent?: boolean
  }>({})
  const phoneRef = useRef<HTMLInputElement>(null)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const name = sanitizeName(String(data.get('name') || '')).trim()
    const consent = data.get('consent') === 'on'
    const next: typeof invalid = {}
    if (!isValidName(name)) next.name = true
    if (!isValidRuMobile(phone)) next.phone = true
    if (!consent) next.consent = true
    setInvalid(next)
    if (Object.keys(next).length) return

    setStatus('sending')
    try {
      const response = await fetch('/next/leads', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name,
          phone: phoneE164(phone),
          consent,
          siteId,
          pageId,
          projectExternalId,
          sourcePath: window.location.pathname,
        }),
      })
      if (!response.ok) throw new Error('lead-failed')
      setStatus('ok')
      form.reset()
      setPhone('+7')
      setInvalid({})
    } catch (error) {
      console.error(error)
      setStatus('error')
    }
  }

  return (
    <form
      className={variant === 'card' ? 'lead-card' : 'lead-form'}
      onSubmit={onSubmit}
      noValidate
    >
      <div>
        <p className="lead-card__title">{heading}</p>
        {body ? <p className="lead-card__body">{body}</p> : null}
      </div>
      <label>
        {copy.name}
        <input
          name="name"
          autoComplete="name"
          placeholder={copy.namePlaceholder}
          aria-invalid={invalid.name || undefined}
          className={invalid.name ? 'is-invalid' : undefined}
          onInput={(e) => {
            const el = e.currentTarget
            const pos = el.selectionStart || 0
            const before = el.value.slice(0, pos)
            const dropped = before.length - sanitizeName(before).length
            el.value = sanitizeName(el.value)
            const next = Math.max(0, pos - dropped)
            el.setSelectionRange(next, next)
            setInvalid((prev) => ({ ...prev, name: false }))
          }}
        />
        {invalid.name ? (
          <span className="lead-field__error" role="alert">
            {copy.leadNameInvalid}
          </span>
        ) : null}
      </label>
      <label>
        {copy.phone}
        <input
          ref={phoneRef}
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder={copy.phonePlaceholder}
          value={phone}
          aria-invalid={invalid.phone || undefined}
          className={invalid.phone ? 'is-invalid' : undefined}
          onFocus={() => {
            if (!nationalPhoneDigits(phone)) {
              setPhone('+7')
              window.setTimeout(() => {
                phoneRef.current?.setSelectionRange(2, 2)
              }, 0)
            }
          }}
          onKeyDown={(e) => {
            const el = e.currentTarget
            const start = el.selectionStart || 0
            const end = el.selectionEnd || 0
            // Префикс +7 не стираем.
            if (e.key === 'Backspace' && start === end && start <= 2) {
              e.preventDefault()
            }
            if (e.key === 'Delete' && start === end && start < 2) {
              e.preventDefault()
            }
            // Пустое поле: 7/8/+ не дублируют код страны.
            if (
              !nationalPhoneDigits(phone) &&
              (e.key === '+' || e.key === '7' || e.key === '8')
            ) {
              e.preventDefault()
            }
          }}
          onChange={(e) => {
            const el = e.currentTarget
            const pos = el.selectionStart || 0
            const before = nationalDigitsBeforeCaret(el.value, pos)
            const masked = maskPhone(el.value)
            setPhone(masked)
            setInvalid((prev) => ({ ...prev, phone: false }))
            window.requestAnimationFrame(() => {
              const next = caretAfterNationalDigits(masked, before)
              el.setSelectionRange(next, next)
            })
          }}
        />
        {invalid.phone ? (
          <span className="lead-field__error" role="alert">
            {copy.leadPhoneInvalid}
          </span>
        ) : null}
      </label>
      <label>
        {copy.message}
        <textarea name="message" rows={5} placeholder={copy.messagePlaceholder} />
      </label>
      <label
        className={
          invalid.consent
            ? 'lead-form__consent is-invalid'
            : 'lead-form__consent'
        }
      >
        <input
          name="consent"
          type="checkbox"
          onChange={() => setInvalid((prev) => ({ ...prev, consent: false }))}
        />
        {copy.consent}
      </label>
      <button className="btn btn-yellow lead-card__submit" type="submit" disabled={status === 'sending'}>
        {status === 'sending' ? copy.sending : submitLabel || copy.sendLead}
        {status !== 'sending' ? (
          <IconArrowUpRight size={18} stroke={2} aria-hidden="true" />
        ) : null}
      </button>
      {status === 'ok' ? <p role="status">{successText || copy.leadOk}</p> : null}
      {status === 'error' ? <p role="alert">{copy.leadError}</p> : null}
    </form>
  )
}
