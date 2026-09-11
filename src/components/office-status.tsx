'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { copy } from '../lib/copy'
import {
  formatRange,
  OFFICE_SCHEDULE,
  readOfficeStatus,
  readServerOfficeStatus,
  rowForDay,
  statusLabel,
  subscribeOfficeStatus,
  type OfficeStatus,
} from '../lib/office'

const STATUS_ORDER: readonly OfficeStatus[] = [
  'open',
  'soon-open',
  'soon-close',
  'closed',
  'unknown',
]

export function OfficeStatusIndicator() {
  const root = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const status = useSyncExternalStore(
    subscribeOfficeStatus,
    readOfficeStatus,
    readServerOfficeStatus,
  )

  // Строка расписания за сегодня подсвечивается в панели. До гидратации дня
  // ещё не знаем, поэтому ничего не выделяем.
  const todayKey = status === 'unknown' ? null : rowForDay(new Date().getDay())?.key

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div
      className="site-office"
      ref={root}
      onPointerEnter={(event) => {
        // На тач-устройствах наведения нет: там работает нажатие.
        if (event.pointerType !== 'touch') setOpen(true)
      }}
      onPointerLeave={() => setOpen(false)}
      onFocusCapture={() => setOpen(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false)
      }}
    >
      <button
        type="button"
        className="site-office__trigger"
        aria-label={`${copy.officeStatusAria}: ${statusLabel(status)}`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className={`site-office__dot site-office__dot--${status}`} aria-hidden="true" />
        <span className="site-office__name">
          {/* Резервируем ширину под самый длинный вариант, чтобы соседние
              элементы не дёргались при смене статуса. */}
          <span className="site-office__sizer" aria-hidden="true">
            {STATUS_ORDER.map((value) => (
              <span key={value}>{statusLabel(value)}</span>
            ))}
          </span>
          <span className="site-office__label">{statusLabel(status)}</span>
        </span>
      </button>

      {open ? (
        <div className="site-office__panel" role="group" aria-label={copy.officeStatusAria}>
          <p className="site-office__panel-status">
            <span className={`site-office__dot site-office__dot--${status}`} aria-hidden="true" />
            {statusLabel(status)}
          </p>
          <dl className="site-office__hours">
            {OFFICE_SCHEDULE.map((row) => (
              <div
                key={row.key}
                className={row.key === todayKey ? 'is-today' : undefined}
                aria-current={row.key === todayKey ? 'date' : undefined}
              >
                <dt>{row.label}</dt>
                <dd>{formatRange(row)}</dd>
              </div>
            ))}
          </dl>
          <Link className="site-office__link" href="/#contacts" onClick={() => setOpen(false)}>
            {copy.officeVisit}
          </Link>
        </div>
      ) : null}
    </div>
  )
}
