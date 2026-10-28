"use client";
import { submitLead, type LeadAttempt } from '../lib/submit-lead'
import { CMSContentBlock } from './cms-content'

import Image from "next/image";
import { optimizedSrc } from '../lib/media';
import { FormSuccessAnimation } from "./form-success-animation";
import { useRef, useState } from "react";
import { IconArrowUpRight } from "@tabler/icons-react";
import { copy, nbspText } from "../lib/copy";
import { noAutofillFieldProps, noAutofillFormProps } from "../lib/no-autofill";

import { PhoneInput } from './phone-input'
import { useLeadCaptcha } from './use-lead-captcha'

type Status = "idle" | "open" | "sending" | "ok" | "error";

function digits(value: string) {
  return value.replace(/\D/g, "");
}

function stripNameDigits(value: string) {
  return value.replace(/\d/g, "");
}

function nameLetters(value: string) {
  return value.replace(/[^a-zA-Z\u0400-\u04FF]/g, "");
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/** Реферальная программа: визуал баннера с формой на кадре. */
export function ReferralProgram({
  siteId,
  pageId,
}: {
  siteId: number | string;
  pageId?: number | string;
}) {
  const data = copy.referralProgram;
  const [status, setStatus] = useState<Status>("idle");
  const submitting = useRef(false);
  const attempt = useRef<LeadAttempt['current']>(null)
  const [phone, setPhone] = useState("");
  const [rules, setRules] = useState(true);
  const [invalid, setInvalid] = useState<Record<string, boolean>>({});
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);

  const open =
    status === "open" ||
    status === "sending" ||
    status === "ok" ||
    status === "error";
  const done = status === "ok";
  const captcha = useLeadCaptcha(open);

  function openForm() {
    setInvalid({});
    setRules(true);
    setStatus("open");
    window.setTimeout(() => nameRef.current?.focus(), 40);
  }

  function closeForm() {
    if (status === "sending") return;
    setInvalid({});
    setStatus("idle");
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || status === "sending" || status === "ok") return;

    const form = event.currentTarget;
    const name = stripNameDigits(
      String(new FormData(form).get("name") || ""),
    ).trim();
    const email = String(new FormData(form).get("email") || "").trim();
    const rulesOn = rules;
    const phoneDigits = digits(phone);
    const next: Record<string, boolean> = {};
    if (nameLetters(name).length < 2) next.name = true;
    if (phoneDigits.length !== 11) next.phone = true;
    if (!validEmail(email)) next.email = true;
    if (!rulesOn) next.rules = true;
    setInvalid(next);
    if (Object.keys(next).length) return;

    submitting.current = true;
    setStatus("sending");
    try {
      const captchaToken = await captcha.verify();
      if (!captcha.isActive()) return;
      await submitLead({
        name,
        phone: `+${phoneDigits}`,
        consent: true,
        siteId,
        pageId,
        formId: "referral-program",
        captchaToken,
        sourceUrl: window.location.href,
        meta: { email },
        sourcePath: `${window.location.pathname}#referral`,
        projectExternalId: `referral:${email}`,
      }, attempt, fetch, captcha.submissionSignal());
      if (!captcha.isActive()) return;
      setStatus("ok");
    } catch {
      if (captcha.isActive()) setStatus("error");
    } finally {
      submitting.current = false;
    }
  }

  return (<CMSContentBlock cmsBlockKey="referralProgram">{(
    <section
      className="section referral"
      data-cms-block="referralProgram"
      id="referral"
      aria-labelledby="referral-title"
    >
      <div className="section__inner">
        <div className={open ? "referral__banner is-open" : "referral__banner"} data-cms-block="referralProgram.banner">
          <div className="referral__media" aria-hidden="true">
            <Image
              className="referral__image referral__image--desktop"
              src={optimizedSrc('/media/referral/banner-desktop.jpg')}
              unoptimized
              alt=""
              fill
              sizes="(min-width: 640px) 100vw, 1px"
              priority={false}
            />
            <Image
              className="referral__image referral__image--mobile"
              src={optimizedSrc('/media/referral/banner-mobile.png')}
              unoptimized
              alt=""
              fill
              sizes="(max-width: 639px) 100vw, 1px"
            />
          </div>

          <div className="referral__stage">
            <div className="referral__copy">
              <h2 id="referral-title">
                {data.headingLines.map((line, index) => (
                  <span key={line}>
                    {index > 0 ? <br /> : null}
                    {nbspText(line)}
                  </span>
                ))}
              </h2>
              {data.paragraphs.map((text) => (
                <p key={text}>
                  {text.split("\n").map((line, index) => (
                    <span key={line}>
                      {index > 0 ? <br /> : null}
                      {nbspText(line)}
                    </span>
                  ))}
                </p>
              ))}
              <button
                className="btn btn-yellow referral__open"
                type="button"
                onClick={openForm}
              >
                {data.openLabel}
                <IconArrowUpRight size={18} stroke={2} aria-hidden="true" />
              </button>
            </div>

            <div className="referral__slot">
              <div
                className={open ? "referral__panel is-open" : "referral__panel"}
                aria-hidden={!open}
              >
                <div
                  className={
                    done ? "referral__card is-done" : "referral__card"
                  }
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="referral-lead"
                >
                  <button
                    className="referral__close"
                    type="button"
                    aria-label={data.closeLabel}
                    onClick={closeForm}
                  >
                    ×
                  </button>

                  <form
                    className="referral__form ym-disable-submit"
                    onSubmit={onSubmit}
                    noValidate
                    {...noAutofillFormProps}
                  >
                    <div className="referral__fields" inert={done}>
                      <p className="referral__lead" id="referral-lead">
                        {nbspText(data.formLead)}
                      </p>

                      <label className="referral__field">
                        <span>{data.nameLabel}</span>
                        <input
                          ref={nameRef}
                          name="name"
                          type="text"
                          {...noAutofillFieldProps}
                          className={[
                            "ym-disable-keys",
                            "ym-hide-content",
                            invalid.name ? "is-invalid" : "",
                          ]
                            .filter(Boolean)
                            .join(" ") || undefined}
                          onInput={(e) => {
                            const el = e.currentTarget;
                            const pos = el.selectionStart || 0;
                            const dropped = (
                              el.value.slice(0, pos).match(/\d/g) || []
                            ).length;
                            el.value = stripNameDigits(el.value);
                            const next = Math.max(0, pos - dropped);
                            el.setSelectionRange(next, next);
                            setInvalid((prev) => ({ ...prev, name: false }));
                          }}
                          required
                        />
                      </label>

                      <label className="referral__field">
                        <span>{data.phoneLabel}</span>
                        <PhoneInput
                          ref={phoneRef}
                          placeholder={copy.phonePlaceholder}
                          name="phone"
                          type="tel"
                          inputMode="tel"
                          {...noAutofillFieldProps}
                          value={phone}
                          className={[
                            "ym-disable-keys",
                            "ym-hide-content",
                            invalid.phone ? "is-invalid" : "",
                          ]
                            .filter(Boolean)
                            .join(" ") || undefined}
                          onValueChange={setPhone}
                          onEdited={() => setInvalid(prev => ({ ...prev, phone: false }))}
                          required
                        />
                      </label>

                      <label className="referral__field">
                        <span>{data.emailLabel}</span>
                        <input
                          name="email"
                          type="email"
                          inputMode="email"
                          {...noAutofillFieldProps}
                          className={[
                            "ym-disable-keys",
                            "ym-hide-content",
                            invalid.email ? "is-invalid" : "",
                          ]
                            .filter(Boolean)
                            .join(" ") || undefined}
                          onInput={() =>
                            setInvalid((prev) => ({ ...prev, email: false }))
                          }
                          required
                        />
                      </label>

                      <label
                        className={
                          invalid.rules
                            ? "referral__check is-invalid"
                            : "referral__check"
                        }
                      >
                        <input
                          name="rules"
                          type="checkbox"
                          checked={rules}
                          required
                          onChange={(event) => {
                            setRules(event.target.checked);
                            setInvalid((prev) => ({ ...prev, rules: false }));
                          }}
                        />
                        <span>
                          {data.rulesPrefix}
                          <a
                            className="referral__link"
                            href={data.rulesHref}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {data.rulesLabel}
                          </a>
                        </span>
                      </label>

                      {captcha.widget}
                      <button
                        className="btn btn-yellow referral__submit"
                        type="submit"
                        disabled={status === "sending" || captcha.reloadRequired}
                      >
                        {status === "sending" ? copy.sending : data.submitLabel}
                        {status === "sending" ? null : (
                          <IconArrowUpRight
                            size={18}
                            stroke={2}
                            aria-hidden="true"
                          />
                        )}
                      </button>
                      {status === "error" ? (
                        <p className="referral__error" role="alert">
                          {captcha.reloadRequired ? 'Не удалось загрузить проверку безопасности. Обновите страницу и повторите отправку.' : copy.leadError}
                        </p>
                      ) : null}
                      {status === 'error' && captcha.reloadRequired ? <button type="button" className="btn" onClick={() => window.location.reload()}>Обновить страницу</button> : null}
                    </div>

                    {done ? <FormSuccessAnimation active={done} title={data.successTitle} description={nbspText(data.successBody)} className="referral__success" /> : null}
                  </form>
                </div>
              </div>
            </div>
          </div>

          <p className="referral__foot">
            {data.rulesFooterPrefix}
            <a className="referral__link" href={data.rulesHref}>
              {data.rulesFooterLabel}
            </a>
          </p>
        </div>
      </div>
    </section>
  )}</CMSContentBlock>);
}
