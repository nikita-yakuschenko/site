'use client'

import { IconArrowUpRight, IconX } from '@tabler/icons-react'
import { useState } from 'react'
import { copy } from '../lib/copy'
import { LeadForm } from './lead-form'

/**
 * Кнопка и форма в одной ячейке: по нажатию текст блока гаснет, форма
 * проявляется на его месте.
 *
 * Приём взят у реферального баннера на главной (.referral__slot): человека
 * никуда не уводят — ни прокруткой к другому разделу, ни оверлеем поверх
 * страницы. Он остаётся там же, где нажал, и видит то, ради чего нажимал.
 *
 * Обе половины лежат в одной клетке грида и перекрещиваются прозрачностью,
 * поэтому высота блока не скачет.
 */
export function LeadReveal({
  siteId,
  label,
  heading,
  body,
  submitLabel,
  children,
}: {
  siteId: number | string
  label: string
  heading: string
  body?: string | null
  submitLabel?: string | null
  /** Содержимое блока, которое гаснет на время показа формы. */
  children?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className={open ? 'lead-reveal is-open' : 'lead-reveal'}>
      <div className="lead-reveal__copy">
        {children}
        <button
          type="button"
          className="btn btn-yellow"
          onClick={() => setOpen(true)}
        >
          {label}
          <IconArrowUpRight size={18} stroke={2} aria-hidden="true" />
        </button>
      </div>

      <div className="lead-reveal__slot" aria-hidden={!open}>
        <div className="lead-reveal__card">
          {/* Крестик в строке подписи первого поля, у правого края. */}
          <button
            type="button"
            className="lead-reveal__close"
            aria-label={copy.close}
            onClick={() => setOpen(false)}
          >
            <IconX size={14} stroke={2.4} />
          </button>
          <LeadForm
            siteId={siteId}
            variant="card"
            compact
            heading={heading}
            body={body}
            submitLabel={submitLabel}
          />
        </div>
      </div>
    </div>
  )
}
