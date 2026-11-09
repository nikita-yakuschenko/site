'use client'

import * as Dialog from '@radix-ui/react-dialog'
import Image from 'next/image'
import { useRef, useState, type MouseEvent } from 'react'
import { IconArrowUpRight, IconX } from '@tabler/icons-react'
import { TECHNOLOGY_OPTIONS } from '../lib/catalog/types'
import { copy } from '../lib/copy'
import { SITE } from '../lib/site'
import { LeadForm } from './lead-form'

const prefab = {
  src: '/logos/AS%20PREFAB.svg',
  alt: 'AS PREFAB',
  description: 'На заводе изготавливаем модули, выполняем отделку, прокладываем коммуникации и электрику, а на участке собираем из них готовый дом. Приезжайте на экскурсию, всё покажем и расскажем.',
}
const preCut = {
  src: '/logos/AS%20Pre-Cut.svg',
  alt: 'AS PRECUT',
  description: 'На заводе изготавливаем и подготавливаем все детали каркаса по проекту, чтобы каждый элемент был готов к сборке. Приезжайте на экскурсию, покажем, как всё устроено.',
}

export function ProjectTechnology({ badge, project }: { badge: string; project: string }) {
  const [open, setOpen] = useState(false)
  const [booking, setBooking] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const close = useRef<HTMLButtonElement>(null)
  const technology = TECHNOLOGY_OPTIONS.find(option => option.value === badge)?.technology
  if (!technology) return <p className="project-hero__badge">{badge}</p>
  const { description, ...logo } = technology === 'frame' ? preCut : prefab

  function show(event: MouseEvent<HTMLButtonElement>) {
    trigger.current = event.currentTarget
    setBooking(false)
    setOpen(true)
  }

  return <Dialog.Root open={open} onOpenChange={setOpen}>
    <div className="project-hero__technology">
      <button type="button" className="project-hero__badge" aria-haspopup="dialog" onClick={show}>{badge}</button>
      <button type="button" className="project-hero__badge" aria-haspopup="dialog" onClick={show}>
        <Image {...logo} className="project-hero__technology-logo" width={586} height={140} unoptimized />
      </button>
    </div>
    <Dialog.Portal>
      <Dialog.Overlay className="ask-dialog technology-dialog__overlay" />
      <Dialog.Content className="ask-dialog__card technology-dialog" aria-describedby={undefined}
        onOpenAutoFocus={event => { event.preventDefault(); close.current?.focus({ preventScroll: true }) }}
        onCloseAutoFocus={event => { event.preventDefault(); trigger.current?.focus({ preventScroll: true }) }}>
        <Dialog.Title className="visually-hidden">{booking ? copy.factoryTour : logo.alt}</Dialog.Title>
        <Dialog.Close ref={close} className="ask-dialog__close" aria-label={copy.close}>
          <IconX size={18} stroke={2.2} />
        </Dialog.Close>
        <div className="technology-dialog__panes">
          <div className="technology-dialog__pane technology-dialog__intro" inert={booking}>
            <Image {...logo} width={586} height={140} className="technology-dialog__logo" unoptimized />
            <p>{description}</p>
            <button type="button" className="btn btn-yellow" onClick={() => {
              close.current?.focus({ preventScroll: true })
              setBooking(true)
            }}>
              Посетить производство <IconArrowUpRight size={18} stroke={2} aria-hidden="true" />
            </button>
          </div>
          <div className="technology-dialog__pane" inert={!booking}>
            <LeadForm formId="factory-tour" siteId={SITE.id} variant="card"
              heading={copy.factoryTour} submitLabel={copy.factoryTour}
              body="Оставьте контакты, мы свяжемся и согласуем удобное время."
              meta={{ projectName: project }} />
          </div>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}
