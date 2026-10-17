'use client'

import { useState } from 'react'
import { isValidName, isValidRuMobile, maskPhone, phoneE164, sanitizeName } from '../../lib/phone'
import { OpenDayArrow, OpenDayRules } from './rules'

export function FactoryOpenDayForm() {
  const [phone, setPhone] = useState('+7')
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle')
  const [invalid, setInvalid] = useState<{ name?: boolean; phone?: boolean; email?: boolean; consent?: boolean }>({})

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
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
    setStatus('sending')
    try {
      const response = await fetch('/next/leads', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name,
          phone: phoneE164(phone),
          message: `Запись на встречу 14 ноября. Email: ${email}`,
          consent: true,
          siteId: 'corporate',
          pageId: 'factory-open-day',
          formId: 'FactoryOpenDayForm',
          sourceUrl: window.location.href,
          sourcePath: window.location.pathname,
          meta: { email, event: 'factory-open-day', date: '14 ноября' },
        }),
      })
      if (!response.ok) throw new Error('lead-failed')
      setStatus('ok')
    } catch {
      setStatus('error')
    }
  }

  return <section className="ags ags-book" id="ags-form">
    <OpenDayRules />
    <div className="ags-sheet">
      <div className="ags-book__body">
        <div className="ags-book__col">
          <h2 className="ags-book__title">До встречи 14 ноября</h2>
          <p className="ags-book__note">Участие бесплатное, по записи. Заполните форму <span className="ags-form-direction--desktop">справа</span><span className="ags-form-direction--compact">ниже</span>, мы пришлём программу мероприятия и напоминание накануне</p>
        </div>
        {status === 'ok' ? <div className="ags-form ags-form--success" role="status">
          <h3>Спасибо за регистрацию!</h3>
          <p className="ags-form__status">Программу мероприятия и напоминание накануне пришлём на почту, указанную при регистрации.</p>
        </div> : <form className="ags-form" onSubmit={onSubmit} noValidate>
          <div className="ags-field">
            <label className="ags-field__label" htmlFor="ags-name">Имя</label>
            <input className="ags-field__input" id="ags-name" name="name" type="text" autoComplete="name" placeholder="Иван Иванов" aria-invalid={invalid.name || undefined} required />
          </div>
          <div className="ags-field">
            <label className="ags-field__label" htmlFor="ags-phone">Телефон</label>
            <input className="ags-field__input" id="ags-phone" name="phone" type="tel" autoComplete="tel" placeholder="+7 9XX XXX XX XX" inputMode="tel" value={phone} aria-invalid={invalid.phone || undefined} onChange={event => setPhone(maskPhone(event.target.value))} required />
          </div>
          <div className="ags-field">
            <label className="ags-field__label" htmlFor="ags-email">Email</label>
            <input className="ags-field__input" id="ags-email" name="email" type="email" autoComplete="email" placeholder="name@example.ru" aria-invalid={invalid.email || undefined} required />
          </div>
          <label className="ags-agree">
            <input className="ags-agree__box" type="checkbox" name="consent" required aria-invalid={invalid.consent || undefined} />
            <span className="ags-agree__tick" aria-hidden="true"><svg viewBox="0 0 24 24" width="12" height="12" fill="none"><path d="M4.5 12.5 9.5 17.5 19.5 6.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
            <span className="ags-agree__text">Согласен на <a href="/legal/privacy" target="_blank" rel="noopener">обработку персональных данных</a></span>
          </label>
          <button className="ags-submit" type="submit" disabled={status === 'sending'}>
            <span className="ags-submit-label">{status === 'sending' ? 'Отправка…' : 'Записаться'}</span>
            <OpenDayArrow />
          </button>
          {status === 'error' ? <p className="ags-form__status" data-error="true">Не удалось отправить. Попробуйте ещё раз.</p> : null}
        </form>}
      </div>
    </div>
  </section>
}
