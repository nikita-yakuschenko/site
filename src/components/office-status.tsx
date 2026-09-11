'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { IconMapPin } from '@tabler/icons-react'
import { copy } from '../lib/copy'
import {
  formatRange,
  OFFICE_SCHEDULE,
  readOfficeState,
  readServerOfficeState,
  statusHeadline,
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
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [open, setOpen] = useState(false)

  // Между строкой и панелью есть зазор. Если закрывать сразу, курсор не
  // успевает его пересечь и до содержимого панели не добраться: даём фору
  // и отменяем её, как только указатель вернулся.
  function show(): void {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = null
    setOpen(true)
  }

  function hideSoon(): void {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setOpen(false), 220)
  }
  // Всё, что зависит от времени, приходит одним снимком: иначе уточнение и
  // подсветка дня подвисали бы, пока статус остаётся прежним.
  const { status, detail, todayKey } = useSyncExternalStore(
    subscribeOfficeStatus,
    readOfficeState,
    readServerOfficeState,
  )

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
  }, [])

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
        if (event.pointerType !== 'touch') show()
      }}
      onPointerLeave={hideSoon}
      onFocusCapture={show}
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
          <div className="site-office__head">
            {/* Точки здесь нет намеренно: пульсирующий индикатор уже стоит
                в шапке, и внутри панели он только отвлекал бы. */}
            <p className="site-office__headline">{statusHeadline(status)}</p>
            {detail ? <p className="site-office__detail">{detail}</p> : null}
          </div>
          <p className="site-office__address">
            <IconMapPin size={18} stroke={1.75} aria-hidden="true" />
            <span>
              <span className="site-office__address-title">{copy.officeAddressTitle}</span>
              <span className="site-office__address-line">{copy.officeAddressLine}</span>
            </span>
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
          <Link
            className="btn btn-yellow site-office__cta"
            href="/#contacts"
            onClick={() => setOpen(false)}
          >
            {copy.officeVisit}
          </Link>
        </div>
      ) : null}
    </div>
  )
}
