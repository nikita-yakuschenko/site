'use client'

import { IconArrowUpRight, IconX } from '@tabler/icons-react'
import Image from 'next/image'
import { useState } from 'react'
import { copy, nbspText } from '../lib/copy'
import { LeadForm } from './lead-form'

/**
 * Плашка «Что можно оформить», у которой вместо перехода — форма.
 *
 * У участка нет своей страницы, и кнопка вела к блоку контактов в самом
 * низу. Теперь форма раскрывается внутри самой плашки: границы, кадр и
 * кнопка остаются на месте, меняется только содержимое подписи. Знак в
 * углу кадра на время показа становится крестиком — он же и закрывает.
 */
export function FinanceLeadCard({
  siteId,
  title,
  text,
  cta,
  image,
  formLead,
  heading,
  body,
}: {
  siteId: number | string
  title: string
  text: string
  cta: string
  image: string
  /** Заголовок раскрытой формы: без него остаются два поля ни о чём. */
  /* Подзаголовок формы есть не у всякой плашки. */
  formLead?: string
  heading: string
  body?: string | null
}) {
  const [open, setOpen] = useState(false)

  return (
    <div
      className={
        open ? 'mortgage-finance__card is-open' : 'mortgage-finance__card'
      }
    >
      {/* Гаснет вся плашка целиком — и кадр, и подпись: форма занимает
          её полностью, а не подвёрстывается снизу под фотографией. */}
      <span className="finance-reveal__copy">
        <span className="mortgage-finance__media">
          <Image
            src={image}
            alt=""
            fill
            sizes="(min-width: 900px) 30vw, 100vw"
          />
        </span>
        <span className="mortgage-finance__body">
          <strong>{title}</strong>
          <span className="mortgage-finance__text">{nbspText(text)}</span>
          <button
            type="button"
            className="btn btn-yellow mortgage-finance__cta"
            onClick={() => setOpen(true)}
          >
            {cta}
            <IconArrowUpRight size={16} stroke={2} aria-hidden="true" />
          </button>
        </span>
      </span>

      <span className="finance-reveal__slot" aria-hidden={!open}>
        <span className="finance-reveal__card">
          {formLead ? (
            <span className="finance-reveal__lead">{nbspText(formLead)}</span>
          ) : null}
          <LeadForm
            siteId={siteId}
            variant="card"
            compact
            heading={heading}
            body={body}
            submitLabel={cta}
          />
        </span>
      </span>

      {/* Знак в углу живёт поверх обоих состояний и не гаснет вместе с
          кадром: закрыто — стрелка, открыто — крестик. */}
      <button
        type="button"
        className="series-bento__go mortgage-finance__toggle"
        aria-label={open ? copy.close : cta}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        {open ? (
          <IconX size={18} stroke={2.2} />
        ) : (
          <IconArrowUpRight size={18} stroke={2} />
        )}
      </button>
    </div>
  )
}
