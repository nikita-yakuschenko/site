'use client'
import { submitLead, type LeadAttempt } from '../../lib/submit-lead'
import { FormSuccessAnimation } from '../form-success-animation'
import { CMSContentBlock } from '../cms-content'

import { useEffect, useRef, useState } from 'react'
import { isValidName, isValidRuMobile, phoneE164, sanitizeName } from '../../lib/phone'
import { PhoneInput } from '../phone-input'
import { copy } from '../../lib/copy'
import { OpenDayArrow, OpenDayRules } from './rules'

const OPEN_BOOKING = 'ags-open-booking'

export function OpenDayBookButton({ className, children }: { className: string; children: React.ReactNode }) {
  return <button type="button" className={className} aria-haspopup="dialog" aria-controls="ags-booking-dialog" onClick={() => window.dispatchEvent(new Event(OPEN_BOOKING))}>{children}</button>
}

export function FactoryOpenDayForm({ date, registrationEnabled = true }: { date: string; registrationEnabled?: boolean }) {
  const submitting = useRef(false)
  const attempt = useRef<LeadAttempt['current']>(null)
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle')
  const [invalid, setInvalid] = useState<{ name?: boolean; phone?: boolean; email?: boolean; consent?: boolean }>({})
  const [open, setOpen] = useState(false)
  const [hold, setHold] = useState(0)
  const slot = useRef<HTMLDivElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current || status === 'ok' || !registrationEnabled) return
    const data = new FormData(event.currentTarget)
    const name = sanitizeName(String(data.get('name') || '')).trim()
    const email = String(data.get('email') || '').trim()
    const next = {
      name: !isValidName(name),
      phone: !isValidRuMobile(phone),
      email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
      consent: data.get('consent') !== 'on',
    }
    setInvalid(next)
    if (Object.values(next).some(Boolean)) return
    submitting.current = true
    setStatus('sending')
    try {
      await submitLead({
        name,
        phone: phoneE164(phone),
        message: `Запись на встречу ${date}. Email: ${email}`,
        consent: true,
        siteId: 'corporate',
        pageId: 'factory-open-day',
        formId: 'FactoryOpenDayForm',
        sourceUrl: window.location.href,
        sourcePath: window.location.pathname,
        meta: { email, event: 'factory-open-day', date },
      }, attempt);
      setStatus('ok')
    } catch {
      setStatus('error')
    } finally {
      submitting.current = false
    }
  }

  function openDialog() {
    const height = slot.current?.firstElementChild?.getBoundingClientRect().height ?? 0
    if (height) setHold(height)
    setOpen(true)
  }

  useEffect(() => {
    const onOpen = () => openDialog()
    window.addEventListener(OPEN_BOOKING, onOpen)
    return () => window.removeEventListener(OPEN_BOOKING, onOpen)
  })

  useEffect(() => {
    const node = dialog.current
    if (!node) return
    if (open) {
      if (!node.open) node.showModal()
      node.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true })
    } else if (node.open) node.close()
  }, [open])

  const fields = status === 'ok' ? <FormSuccessAnimation active title="Вы записаны на день открытых дверей!" description="Программу мероприятия и напоминание накануне пришлём на почту, указанную при регистрации." className="ags-form ags-form--success" /> : <form className="ags-form" onSubmit={onSubmit} noValidate>
    <div className="ags-field">
      <label className="ags-field__label" htmlFor="ags-name">Имя</label>
      <input className="ags-field__input" id="ags-name" name="name" type="text" autoComplete="name" placeholder="Иван Иванов" value={name} aria-invalid={Boolean(invalid.name)} aria-required="true" onChange={event => { setName(event.target.value); setInvalid(prev => ({ ...prev, name: false })) }} />
    </div>
    <div className="ags-field">
      <label className="ags-field__label" htmlFor="ags-phone">Телефон</label>
      <PhoneInput className="ags-field__input" id="ags-phone" name="phone" type="tel" autoComplete="tel" placeholder={copy.phonePlaceholder} inputMode="tel" value={phone} aria-invalid={Boolean(invalid.phone)} aria-required="true" onValueChange={setPhone} onEdited={() => setInvalid(prev => ({ ...prev, phone: false }))} />
    </div>
    <div className="ags-field">
      <label className="ags-field__label" htmlFor="ags-email">Email</label>
      <input className="ags-field__input" id="ags-email" name="email" type="email" autoComplete="email" placeholder="name@example.ru" value={email} aria-invalid={Boolean(invalid.email)} aria-required="true" onChange={event => { setEmail(event.target.value); setInvalid(prev => ({ ...prev, email: false })) }} />
    </div>
    <label className="ags-agree">
      <input className="ags-agree__box" type="checkbox" name="consent" aria-required="true" aria-invalid={Boolean(invalid.consent)} onChange={() => setInvalid(prev => ({ ...prev, consent: false }))} />
      <span className="ags-agree__tick" aria-hidden="true"><svg viewBox="0 0 24 24" width="12" height="12" fill="none"><path d="M4.5 12.5 9.5 17.5 19.5 6.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
      <span className="ags-agree__text">Согласен на <a href="/legal/privacy" target="_blank" rel="noopener">обработку персональных данных</a></span>
    </label>
    <button className="ags-submit" type="submit" disabled={status === 'sending' || !registrationEnabled}>
      <span className="ags-submit-label">{!registrationEnabled ? 'Регистрация закрыта' : status === 'sending' ? 'Отправка…' : 'Записаться'}</span>
      <OpenDayArrow />
    </button>
    {status === 'error' ? <p className="ags-form__status" data-error="true">Не удалось отправить. Попробуйте ещё раз.</p> : null}
  </form>

  return (<CMSContentBlock cmsBlockKey="FactoryOpenDayForm">{<section className="ags ags-book" id="ags-form">
    <OpenDayRules />
    <div className="ags-sheet">
      <div className="ags-book__body">
        <div className="ags-book__col">
          <h2 className="ags-book__title">До встречи <span data-cms-content-connected>{date}</span></h2>
          <p className="ags-book__note">Участие бесплатное, по записи. Заполните форму <span className="ags-form-direction--desktop">справа</span><span className="ags-form-direction--compact">ниже</span>, мы пришлём программу мероприятия и напоминание накануне</p>
        </div>
        <div ref={slot} style={{ display: 'contents' }}>{open ? <div className="ags-form-placeholder" style={{ height: hold }} /> : fields}</div>
      </div>
    </div>
    <dialog
      ref={dialog}
      id="ags-booking-dialog"
      className="ags ags-dialog"
      aria-labelledby="ags-dialog-title"
      onCancel={event => { event.preventDefault(); setOpen(false) }}
      onClick={event => { if (event.target === dialog.current) setOpen(false) }}
    >
      <button type="button" className="ags-dialog__close" aria-label="Закрыть окно" onClick={() => setOpen(false)}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" /></svg>
      </button>
      <h2 id="ags-dialog-title">Записаться<span className="ags-dialog__title-line">на <span className="ags-highlight">День открытых дверей</span></span></h2>
      <div className="ags-dialog__form">{open ? fields : null}</div>
    </dialog>
  </section>}</CMSContentBlock>)
}
