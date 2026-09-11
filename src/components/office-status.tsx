'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { IconBus, IconMapPin } from '@tabler/icons-react'
import { copy } from '../lib/copy'
import {
  formatRange,
  OFFICE_SCHEDULE,
  OFFICE_ROUTE_URL,
  OFFICE_TRANSIT,
  readOfficeState,
  readServerOfficeState,
  statusHeadline,
  subscribeOfficeStatus,
} from '../lib/office'
import { OfficeMap } from './office-map'

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
  const { status, trigger, triggerShort, detail, todayKey } = useSyncExternalStore(
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
      onPointerLeave={(event) => {
        // На тач-устройствах pointerleave приходит сразу после касания —
        // панель открывалась и тут же захлопывалась. Уводить курсор там
        // некуда, закрытие остаётся на повторном нажатии и на тапе вне.
        if (event.pointerType !== 'touch') hideSoon()
      }}
      onFocusCapture={show}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false)
      }}
    >
      <button
        type="button"
        className="site-office__trigger"
        aria-label={`${copy.officeStatusAria}: ${trigger}`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className={`site-office__dot site-office__dot--${status}`} aria-hidden="true" />
        {/* Ширина под самый длинный статус больше не резервируется: резерв
            отрывал точку от надписи на половину строки, а индикатор обязан
            стоять рядом с тем, к чему относится. Статус меняется пару раз в
            сутки, так что переток ряда никто не увидит. */}
        {/* Два варианта надписи, переключаются шириной экрана: в узкой шапке
            рядом остаётся только город, и длинная формулировка выталкивала бы
            его за край. */}
        <span className="site-office__label site-office__label--full">{trigger}</span>
        <span className="site-office__label site-office__label--short">{triggerShort}</span>
      </button>

      {open ? (
        <div className="site-office__panel" role="group" aria-label={copy.officeStatusAria}>
          <div className="site-office__head">
            {/* Точки здесь нет намеренно: пульсирующий индикатор уже стоит
                в шапке, и внутри панели он только отвлекал бы. */}
            <p className="site-office__headline">{statusHeadline(status)}</p>
            {detail ? <p className="site-office__detail">{detail}</p> : null}
          </div>
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
          {/* Карта — превью: жесты сняты, клик ведёт на маршрут, туда же,
              куда кнопка ниже. Ключ компонент запрашивает сам; без ключа
              блок остаётся свёрнутым в ноль и панель работает как прежде. */}
          <OfficeMap onNavigate={() => setOpen(false)} />
          <ul className="site-office__transit">
            {OFFICE_TRANSIT.map((stop) => (
              <li key={stop.name}>
                <IconBus size={18} stroke={1.75} aria-hidden="true" />
                <span className="site-office__transit-name">{stop.name}</span>
                <span className="site-office__transit-distance">{stop.distance}</span>
              </li>
            ))}
          </ul>
          <p className="site-office__address">
            <IconMapPin size={18} stroke={1.75} aria-hidden="true" />
            <span>
              <span className="site-office__address-title">{copy.officeAddressTitle}</span>
              <span className="site-office__address-line">{copy.officeAddressLine}</span>
            </span>
          </p>
          {/* Внешний ресурс, поэтому обычная ссылка, а не Link, и новая
              вкладка: уводить человека со страницы незачем. */}
          <a
            className="btn btn-yellow site-office__cta"
            href={OFFICE_ROUTE_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
          >
            {copy.officeVisit}
          </a>
        </div>
      ) : null}
    </div>
  )
}
