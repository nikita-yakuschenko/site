'use client'

import { useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useProjectLeadContext } from './project-lead-context'
import { readRegionCode } from '../lib/regions'
import { IconArrowUpRight } from '@tabler/icons-react'
import { copy } from '../lib/copy'
import {
  isValidName,
  isValidRuMobile,
  phoneE164,
  sanitizeName,
} from '../lib/phone'
import { noAutofillFieldProps, noAutofillFormProps } from '../lib/no-autofill'
import { LeadSubmitFeedback } from './lead-submit-feedback'
import { submitLead, type LeadAttempt } from '../lib/submit-lead'
import { PhoneInput } from './phone-input'
import { useLeadCaptcha } from './use-lead-captcha'

function documentProject(): { id: string; cmsId?: string; slug: string; name: string } | null {
  if (typeof document === 'undefined') return null
  const name = document.documentElement.dataset.leadProject?.trim() || ''
  if (!name) return null
  return {
    id: document.documentElement.dataset.leadProjectId || '',
    slug: document.documentElement.dataset.leadProjectSlug || '',
    name,
  }
}

export function LeadForm({
  siteId,
  pageId,
  projectExternalId,
  projectId,
  formId,
  heading,
  body,
  submitLabel,
  successText,
  onSuccess,
  actionHref,
  actionLabel,
  actionChannel,
  variant = 'page',
  compact = false,
  nameLabel,
  phoneOnly = false,
  withMessage = false,
  meta,
  active = true,
  children,
}: {
  active?: boolean
  siteId: number | string
  pageId?: number | string
  projectExternalId?: string
  projectId?: string
  formId?: string
  heading: string
  body?: string | null
  submitLabel?: string | null
  successText?: string | null
  onSuccess?: () => void
  actionHref?: string
  actionLabel?: string
  actionChannel?: 'max' | 'telegram' | 'whatsapp'
  variant?: 'page' | 'card'
  /**
   * Короткая форма: только имя, телефон, согласие и кнопка.
   *
   * Нужна там, где форма проявляется внутри баннера и не должна менять
   * его высоту. Заголовок с подзаголовком там лишние — их роль играет сам
   * баннер, — а поле «Сообщение» бессмысленно: человек дошёл до кнопки,
   * уже прочитав условия, вопросы задаст по телефону.
   */
  compact?: boolean
  /** Messenger callbacks require only a phone; preserve the intake name contract with the form heading. */
  phoneOnly?: boolean
  /** Подпись поля имени. По умолчанию «Имя». */
  nameLabel?: string
  /** Поле «Сообщение» только у вопроса в шапке и у формы в блоке контактов. */
  withMessage?: boolean
  /**
   * Произвольные данные, уходящие вместе с заявкой.
   *
   * Калькулятор кладёт сюда параметры расчёта: что человек накликал, на
   * каком платеже остановился и какую программу выбрал. Без этого заявка
   * приходит голой, и разговор начинается с «а что вы там считали?».
   */
  meta?: Record<string, unknown>
  /** Поля перед именем: у планировки это площадь, комнаты и пожелание. */
  children?: ReactNode
}) {
  const project = useProjectLeadContext()
  const listed = project ?? documentProject()
  const resolvedFormId = formId || 'lead-form'
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle')
  const [phone, setPhone] = useState('')
  const [consent, setConsent] = useState(true)
  const captcha = useLeadCaptcha(active)
  const [invalid, setInvalid] = useState<{
    name?: boolean
    phone?: boolean
    consent?: boolean
  }>({})
  const phoneRef = useRef<HTMLInputElement>(null)
  const attempt = useRef<LeadAttempt['current']>(null)
  const submitting = useRef(false)
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current || status === 'ok') return
    const form = event.currentTarget
    const data = new FormData(form)
    const name = phoneOnly ? heading : sanitizeName(String(data.get('name') || '')).trim()
    const agreed = data.get('consent') === 'on'
    const next: typeof invalid = {}
    if (!phoneOnly && !isValidName(name)) next.name = true
    if (!isValidRuMobile(phone)) next.phone = true
    if (!agreed) next.consent = true
    setInvalid(next)
    if (Object.keys(next).length) return

    submitting.current = true
    // Высоту фиксируем до смены состояния: подпись кнопки, капча и экран успеха иначе двигают карточку.
    const card = form.closest<HTMLElement>('.ask-dialog__card')
    if (card) card.style.height = `${Math.round(card.getBoundingClientRect().height)}px`
    form.style.height = `${Math.round(form.getBoundingClientRect().height)}px`
    setStatus('sending')
    try {
      const captchaToken = await captcha.verify()
      if (!captcha.isActive()) return
      await submitLead({
        name,
        phone: phoneE164(phone),
        message: String(data.get('message') || '').trim(),
        consent: agreed,
        siteId,
        pageId: pageId ?? listed?.slug,
        projectExternalId: projectExternalId ?? (listed?.id || undefined),
        projectId: projectId ?? listed?.cmsId,
        formId: resolvedFormId,
        captchaToken,
        sourceUrl: window.location.href,
        sourcePath: window.location.pathname,
        meta: { region: readRegionCode(), formHeading: heading, pageTitle: document.title, ...(listed ? { projectSlug: listed.slug, projectName: listed.name } : {}), ...meta },
      }, attempt, fetch, captcha.submissionSignal())
      if (!captcha.isActive()) return
      setStatus('ok')
      onSuccess?.()
      form.reset()
      setPhone('')
      setConsent(true)
      setInvalid({})
    } catch (error) {
      form.style.height = ''
      card?.style.setProperty('height', '')
      if (captcha.isActive()) {
        console.error(error)
        setStatus('error')
      } else if (captcha.isMounted()) setStatus('idle')
    } finally {
      submitting.current = false
    }
  }

  return (
    <form
      data-cms-block="LeadForm"
      data-form-id={resolvedFormId}
      className={`${variant === 'card' ? 'lead-card' : 'lead-form'} ym-disable-submit`}
      onSubmit={onSubmit}
      aria-busy={status === 'sending'}
      noValidate
      {...noAutofillFormProps}
    >
      {compact ? null : (
        <div>
          <p className="lead-card__title">{heading}</p>
          {body ? <p className="lead-card__body">{body}</p> : null}
        </div>
      )}
      {children}
      {!phoneOnly && <label>
        {nameLabel || copy.name}
        <input
          name="name"
          {...noAutofillFieldProps}
          placeholder={copy.namePlaceholder}
          aria-invalid={invalid.name || undefined}
          className={['ym-disable-keys', 'ym-hide-content', invalid.name ? 'is-invalid' : '']
            .filter(Boolean)
            .join(' ') || undefined}
          onInput={(e) => {
            const el = e.currentTarget
            const pos = el.selectionStart || 0
            const before = el.value.slice(0, pos)
            const dropped = before.length - sanitizeName(before).length
            el.value = sanitizeName(el.value)
            const next = Math.max(0, pos - dropped)
            el.setSelectionRange(next, next)
            setInvalid((prev) => ({ ...prev, name: false }))
          }}
        />
        {invalid.name ? (
          <span className="lead-field__error is-quiet" role="alert">
            {copy.leadNameInvalid}
          </span>
        ) : null}
      </label>}
      <label>
        {copy.phone}
        <PhoneInput
          ref={phoneRef}
          name="phone"
          type="tel"
          inputMode="tel"
          {...noAutofillFieldProps}
          placeholder={copy.phonePlaceholder}
          value={phone}
          aria-invalid={invalid.phone || undefined}
          className={['ym-disable-keys', 'ym-hide-content', invalid.phone ? 'is-invalid' : '']
            .filter(Boolean)
            .join(' ') || undefined}
          onValueChange={setPhone}
          onEdited={() => setInvalid(prev => ({ ...prev, phone: false }))}
        />
        {invalid.phone ? (
          <span className="lead-field__error is-quiet" role="alert">
            {copy.leadPhoneInvalid}
          </span>
        ) : null}
      </label>
      {compact || !withMessage ? null : (
        <label>
          {copy.message}
          <textarea
            name="message"
            rows={5}
            placeholder={copy.messagePlaceholder}
            className="ym-disable-keys ym-hide-content"
            {...noAutofillFieldProps}
          />
        </label>
      )}
      <label
        className={
          invalid.consent
            ? 'lead-form__consent is-invalid'
            : 'lead-form__consent'
        }
      >
        <input
          name="consent"
          type="checkbox"
          checked={consent}
          onChange={(event) => {
            setConsent(event.target.checked)
            setInvalid((prev) => ({ ...prev, consent: false }))
          }}
        />
        <span>
          {copy.consentPrefix}
          <Link
            className="lead-form__consent-link"
            href={copy.personalDataHref}
            onClick={(e) => e.stopPropagation()}
          >
            {copy.consentLinkLabel}
          </Link>
        </span>
      </label>
      {captcha.widget}
      <button className="btn btn-yellow lead-card__submit" type="submit" disabled={status === 'sending' || captcha.reloadRequired}>
        {status === 'sending' ? copy.sending : submitLabel || copy.sendLead}
        {status !== 'sending' ? (
          <IconArrowUpRight size={18} stroke={2} aria-hidden="true" />
        ) : null}
      </button>
      {status === 'sending' || status === 'ok' ? <LeadSubmitFeedback status={status} text={successText} formId={resolvedFormId} actionHref={actionHref} actionLabel={actionLabel} actionChannel={actionChannel} /> : null}
      {status === 'error' ? <p role="alert">{captcha.reloadRequired ? 'Не удалось загрузить проверку безопасности. Обновите страницу и повторите отправку.' : 'Не удалось получить подтверждение. Повторите отправку — повторная попытка не создаст дубль заявки.'}</p> : null}
      {status === 'error' && captcha.reloadRequired ? <button type="button" className="btn" onClick={() => window.location.reload()}>Обновить страницу</button> : null}
    </form>
  )
}
