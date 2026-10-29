'use client'
import { CMSContentBlock } from './cms-content'

import { IconArrowUpRight, IconX } from '@tabler/icons-react'
import { useRef, useState } from 'react'
import { useMobileFormReveal } from './use-mobile-form-reveal'
import { copy } from '../lib/copy'
import { LeadForm } from './lead-form'
import { PanelLeadForm } from './panel-lead-form'

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
  formId = 'inline-request',
  siteId,
  label,
  heading,
  body,
  submitLabel,
  meta,
  classes,
  buttonClassName = 'btn btn-yellow',
  children,
  formIntro,
  projectExternalId,
  variant = 'crossfade',
}: {
  formId?: string
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
  formIntro?: React.ReactNode
  variant?: 'crossfade' | 'panel'
  projectExternalId?: string
}) {
  const [open, setOpen] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  useMobileFormReveal(open, cardRef)

  if (variant === 'panel') return (
    <CMSContentBlock cmsBlockKey={`LeadReveal-instance-${formId.replace(/[^a-zA-Z0-9]+/g, "-")}`}><div className={[classes?.root, 'mortgage-request', open ? 'is-open' : ''].filter(Boolean).join(' ')}>
      <div className="mortgage-request__summary" inert={open} aria-hidden={open}>
        <div>{children}</div>
      </div>
      <PanelLeadForm formId={formId} siteId={siteId} projectExternalId={projectExternalId}
        label={label} heading={heading} submitLabel={submitLabel ?? label} meta={meta}
        formIntro={formIntro} closable animateTrigger onOpenChange={setOpen} />
    </div></CMSContentBlock>
  )

  return (<CMSContentBlock cmsBlockKey={`LeadReveal-instance-${formId.replace(/[^a-zA-Z0-9]+/g, "-")}`}>{(
    <div
      className={[
        'lead-reveal',
        classes?.root,
        open ? 'is-open' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className={['lead-reveal__copy', classes?.copy].filter(Boolean).join(' ')} inert={open} aria-hidden={open}>
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
        <div ref={cardRef} className={['lead-reveal__card', classes?.card].filter(Boolean).join(' ')}>
          {/* Крестик в строке подписи первого поля, у правого края. */}
          <button
            type="button"
            className="lead-reveal__close"
            aria-label={copy.close}
            onClick={() => setOpen(false)}
          >
            <IconX size={14} stroke={2.4} />
          </button>
          {formIntro}
          <LeadForm active={open} formId={formId}
            projectExternalId={projectExternalId}
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
  )}</CMSContentBlock>)
}
