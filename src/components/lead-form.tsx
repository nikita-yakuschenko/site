'use client'

import { useState } from 'react'
import { copy } from '../lib/copy'

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
  siteId: number
  pageId?: number
  projectExternalId?: string
  heading: string
  body?: string | null
  submitLabel?: string | null
  successText?: string | null
  variant?: 'page' | 'card'
}) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle')

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    setStatus('sending')
    try {
      const response = await fetch('/next/leads', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: String(data.get('name') || ''),
          phone: String(data.get('phone') || ''),
          consent: data.get('consent') === 'on',
          siteId,
          pageId,
          projectExternalId,
          sourcePath: window.location.pathname,
        }),
      })
      if (!response.ok) throw new Error('lead-failed')
      setStatus('ok')
      form.reset()
    } catch (error) {
      console.error(error)
      setStatus('error')
    }
  }

  return (
    <form className={variant === 'card' ? 'lead-card' : 'lead-form'} onSubmit={onSubmit}>
      <div>
        <p className="lead-card__title">{heading}</p>
        {body ? <p className="lead-card__body">{body}</p> : null}
      </div>
      <label>
        {copy.name}
        <input name="name" required minLength={2} autoComplete="name" placeholder={copy.namePlaceholder} />
      </label>
      <label>
        {copy.phone}
        <input name="phone" required autoComplete="tel" inputMode="tel" />
      </label>
      <label>
        {copy.message}
        <textarea name="message" rows={5} placeholder={copy.messagePlaceholder} />
      </label>
      <label className="lead-form__consent">
        <input name="consent" type="checkbox" required />
        {copy.consent}
      </label>
      <button className="btn btn-yellow lead-card__submit" type="submit" disabled={status === 'sending'}>
        {status === 'sending' ? copy.sending : submitLabel || copy.sendLead}
      </button>
      {status === 'ok' ? <p role="status">{successText || copy.leadOk}</p> : null}
      {status === 'error' ? <p role="alert">{copy.leadError}</p> : null}
    </form>
  )
}
