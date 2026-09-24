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
  meta,
  classes,
  buttonClassName = 'btn btn-yellow',
  children,
}: {
  siteId: number | string
  label: string
  heading: string
  body?: string | null
  submitLabel?: string | null
  /** Данные расчёта, уходящие вместе с заявкой. */
  meta?: Record<string, unknown>
  /** Местные классы поверх базовых: блок остаётся общим, а раскладка
   *  у каждого своя — в калькуляторе форма садится на место кнопки
   *  расчёта, в баннере просто занимает клетку. */
  classes?: { root?: string; copy?: string; slot?: string; card?: string }
  buttonClassName?: string
  /** Содержимое блока, которое гаснет на время показа формы. */
  children?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <div
      className={[
        'lead-reveal',
        classes?.root,
        open ? 'is-open' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className={['lead-reveal__copy', classes?.copy].filter(Boolean).join(' ')}>
        {children}
        <button
          type="button"
          className={buttonClassName}
          onClick={() => setOpen(true)}
        >
          {label}
          <IconArrowUpRight size={18} stroke={2} aria-hidden="true" />
        </button>
      </div>

      <div
        className={['lead-reveal__slot', classes?.slot].filter(Boolean).join(' ')}
        aria-hidden={!open}
      >
        <div className={['lead-reveal__card', classes?.card].filter(Boolean).join(' ')}>
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
            meta={meta}
          />
        </div>
      </div>
    </div>
  )
}
