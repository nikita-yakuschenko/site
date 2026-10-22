'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useProjectLeadContext } from './project-lead-context'
import { readRegionCode } from '../lib/regions'
import { IconArrowUpRight } from '@tabler/icons-react'
import { copy } from '../lib/copy'
import {
  caretAfterNationalDigits,
  isValidName,
  isValidRuMobile,
  maskPhone,
  nationalDigitsBeforeCaret,
  nationalPhoneDigits,
  phoneE164,
  sanitizeName,
} from '../lib/phone'
import { noAutofillFieldProps, noAutofillFormProps } from '../lib/no-autofill'
import { LeadSubmitFeedback } from './lead-submit-feedback'
import { submitLead, type LeadAttempt } from '../lib/submit-lead'
import { InvisibleSmartCaptcha } from '@yandex/smart-captcha'

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
  variant = 'page',
  compact = false,
  withMessage = false,
  meta,
}: {
  siteId: number | string
  pageId?: number | string
  projectExternalId?: string
  projectId?: string
  formId?: string
  heading: string
  body?: string | null
  submitLabel?: string | null
  successText?: string | null
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
}) {
  const project = useProjectLeadContext()
  const resolvedFormId = formId || 'lead-form'
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle')
  const [phone, setPhone] = useState('+7')
  const [consent, setConsent] = useState(true)
  const [captchaVisible, setCaptchaVisible] = useState(false)
  const [captchaReset, setCaptchaReset] = useState(0)
  const [captchaSiteKey, setCaptchaSiteKey] = useState<string | null>(null)
  const [captchaReady, setCaptchaReady] = useState(false)
  const [invalid, setInvalid] = useState<{
    name?: boolean
    phone?: boolean
    consent?: boolean
  }>({})
  const phoneRef = useRef<HTMLInputElement>(null)
  const attempt = useRef<LeadAttempt['current']>(null)
  const submitting = useRef(false)
  const captchaPending = useRef<{ resolve: (token: string) => void; reject: (error: Error) => void } | null>(null)

  function failCaptcha() {
    captchaPending.current?.reject(new Error('Не удалось пройти проверку безопасности'))
    captchaPending.current = null
    setCaptchaVisible(false)
  }

  useEffect(() => () => {
    captchaPending.current?.reject(new Error('Форма закрыта'))
    captchaPending.current = null
  }, [])

  useEffect(() => {
    let active = true
    fetch('/api/smartcaptcha-config', { cache: 'no-store' })
      .then(response => response.ok ? response.json() : null)
      .then(data => { if (active) { setCaptchaSiteKey(typeof data?.siteKey === 'string' ? data.siteKey : null); setCaptchaReady(true) } })
      .catch(() => { if (active) setCaptchaReady(true) })
    return () => { active = false }
  }, [])

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current || status === 'ok') return
    const form = event.currentTarget
    const data = new FormData(form)
    const name = sanitizeName(String(data.get('name') || '')).trim()
    const agreed = data.get('consent') === 'on'
    const next: typeof invalid = {}
    if (!isValidName(name)) next.name = true
    if (!isValidRuMobile(phone)) next.phone = true
    if (!agreed) next.consent = true
    setInvalid(next)
    if (Object.keys(next).length) return
    if (!captchaReady || !captchaSiteKey) return setStatus('error')

    submitting.current = true
    setStatus('sending')
    let captchaTimeout: ReturnType<typeof setTimeout> | undefined
    try {
      const captchaToken = await new Promise<string>((resolve, reject) => {
        captchaPending.current = { resolve, reject }
        captchaTimeout = setTimeout(failCaptcha, 120_000)
        setCaptchaVisible(true)
      })
      clearTimeout(captchaTimeout)
      await submitLead({
        name,
        phone: phoneE164(phone),
        message: String(data.get('message') || '').trim(),
        consent: agreed,
        siteId,
        pageId: pageId ?? project?.slug,
        projectExternalId: projectExternalId ?? project?.id,
        projectId: projectId ?? project?.cmsId,
        formId: resolvedFormId,
        captchaToken,
        sourceUrl: window.location.href,
        sourcePath: window.location.pathname,
        meta: { region: readRegionCode(), formHeading: heading, ...(project ? { projectSlug: project.slug, projectName: project.name } : {}), ...meta },
      }, attempt)
      setStatus('ok')
      form.reset()
      setPhone('+7')
      setConsent(true)
      setInvalid({})
    } catch (error) {
      console.error(error)
      setStatus('error')
    } finally {
      clearTimeout(captchaTimeout)
      captchaPending.current = null
      setCaptchaVisible(false)
      setCaptchaReset(value => value + 1)
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
      <label>
        {copy.name}
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
      </label>
      <label>
        {copy.phone}
        <input
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
          onFocus={() => {
            if (!nationalPhoneDigits(phone)) {
              setPhone('+7')
              window.setTimeout(() => {
                phoneRef.current?.setSelectionRange(2, 2)
              }, 0)
            }
          }}
          onKeyDown={(e) => {
            const el = e.currentTarget
            const start = el.selectionStart || 0
            const end = el.selectionEnd || 0
            // Префикс +7 не стираем.
            if (e.key === 'Backspace' && start === end && start <= 2) {
              e.preventDefault()
            }
            if (e.key === 'Delete' && start === end && start < 2) {
              e.preventDefault()
            }
            // Пустое поле: 7/8/+ не дублируют код страны.
            if (
              !nationalPhoneDigits(phone) &&
              (e.key === '+' || e.key === '7' || e.key === '8')
            ) {
              e.preventDefault()
            }
          }}
          onChange={(e) => {
            const el = e.currentTarget
            const pos = el.selectionStart || 0
            const before = nationalDigitsBeforeCaret(el.value, pos)
            const masked = maskPhone(el.value)
            setPhone(masked)
            setInvalid((prev) => ({ ...prev, phone: false }))
            window.requestAnimationFrame(() => {
              const next = caretAfterNationalDigits(masked, before)
              el.setSelectionRange(next, next)
            })
          }}
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
      {captchaSiteKey ? <InvisibleSmartCaptcha
        key={captchaReset}
        sitekey={captchaSiteKey}
        visible={captchaVisible}
        onSuccess={token => {
          captchaPending.current?.resolve(token)
          captchaPending.current = null
          setCaptchaVisible(false)
        }}
        onChallengeHidden={() => {
          setCaptchaVisible(false)
          // Успех может прийти вместе с закрытием задания: сначала даём
          // обработчику onSuccess принять токен, затем обрабатываем отмену.
          window.setTimeout(() => {
            if (captchaPending.current) failCaptcha()
          }, 0)
        }}
        onNetworkError={failCaptcha}
        onJavascriptError={failCaptcha}
        language="ru"
      /> : null}
      <button className="btn btn-yellow lead-card__submit" type="submit" disabled={status === 'sending'}>
        {status === 'sending' ? copy.sending : submitLabel || copy.sendLead}
        {status !== 'sending' ? (
          <IconArrowUpRight size={18} stroke={2} aria-hidden="true" />
        ) : null}
      </button>
      {status === 'sending' || status === 'ok' ? <LeadSubmitFeedback status={status} text={successText} formId={resolvedFormId} /> : null}
      {status === 'error' ? <p role="alert">Не удалось получить подтверждение. Повторите отправку — повторная попытка не создаст дубль заявки.</p> : null}
    </form>
  )
}
