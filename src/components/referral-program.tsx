"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { IconArrowUpRight } from "@tabler/icons-react";
import { copy, nbspText } from "../lib/copy";

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

function nationalDigits(value: string) {
  let d = digits(value);
  while (d.startsWith("7") || d.startsWith("8")) d = d.slice(1);
  while (d.length && !d.startsWith("9")) d = d.slice(1);
  return d.slice(0, 10);
}

function maskPhone(value: string) {
  const n = nationalDigits(value);
  let out = "+7";
  if (n.length) out += ` ${n.slice(0, 3)}`;
  if (n.length > 3) out += ` ${n.slice(3, 6)}`;
  if (n.length > 6) out += `-${n.slice(6, 8)}`;
  if (n.length > 8) out += `-${n.slice(8, 10)}`;
  return out;
}

function nationalBeforeCaret(value: string, pos: number) {
  return nationalDigits(value.slice(0, pos)).length;
}

function caretAfterNational(formatted: string, count: number) {
  if (count <= 0) return 2;
  let seen = 0;
  for (let i = 2; i < formatted.length; i++) {
    if (/\d/.test(formatted[i]!)) {
      seen += 1;
      if (seen === count) return i + 1;
    }
  }
  return formatted.length;
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
  const [phone, setPhone] = useState("+7");
  const [invalid, setInvalid] = useState<Record<string, boolean>>({});
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const okRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);

  const open =
    status === "open" ||
    status === "sending" ||
    status === "ok" ||
    status === "error";
  const done = status === "ok";

  function clearTimers() {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  }

  useEffect(() => () => clearTimers(), []);

  function openForm() {
    setInvalid({});
    setStatus("open");
    window.setTimeout(() => nameRef.current?.focus(), 40);
  }

  function closeForm() {
    if (status === "sending") return;
    clearTimers();
    setInvalid({});
    setStatus("idle");
  }

  function playOk() {
    const el = okRef.current;
    if (!el) return;
    clearTimers();
    el.classList.remove("is-anim", "is-morph", "is-settle");
    const paths = el.querySelectorAll<SVGPathElement>(
      ".referral__ok-circle, .referral__ok-tick",
    );
    paths.forEach((path) => {
      path.style.transition = "none";
      path.style.strokeDasharray = "0";
      path.style.strokeDashoffset = "0";
    });
    el.getBoundingClientRect();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.classList.add("is-anim", "is-morph", "is-settle");
      return;
    }
    el.classList.add("is-anim");
    timers.current.push(
      window.setTimeout(() => {
        el.classList.add("is-morph");
        paths.forEach((path, i) => {
          const len = path.getTotalLength();
          path.style.transition = "none";
          path.style.strokeDasharray = String(len);
          path.style.strokeDashoffset = String(len);
          path.getBoundingClientRect();
          path.style.transition = `stroke-dashoffset .5s var(--ease-out) ${i * 0.22}s`;
          path.style.strokeDashoffset = "0";
        });
      }, 950),
    );
    timers.current.push(
      window.setTimeout(() => el.classList.add("is-settle"), 2100),
    );
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending" || status === "ok") return;

    const form = event.currentTarget;
    const name = stripNameDigits(
      String(new FormData(form).get("name") || ""),
    ).trim();
    const email = String(new FormData(form).get("email") || "").trim();
    const rulesOn = form.querySelector<HTMLInputElement>('[name="rules"]')
      ?.checked;
    const phoneDigits = digits(phone);
    const next: Record<string, boolean> = {};
    if (nameLetters(name).length < 2) next.name = true;
    if (phoneDigits.length !== 11) next.phone = true;
    if (!validEmail(email)) next.email = true;
    if (!rulesOn) next.rules = true;
    setInvalid(next);
    if (Object.keys(next).length) return;

    setStatus("sending");
    try {
      const response = await fetch("/next/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          phone: `+${phoneDigits}`,
          consent: true,
          siteId: Number(siteId),
          pageId: pageId ? Number(pageId) : undefined,
          sourcePath: `${window.location.pathname}#referral`,
          projectExternalId: `referral:${email}`,
        }),
      });
      if (!response.ok) throw new Error("lead-failed");
      setStatus("ok");
      window.setTimeout(playOk, 30);
    } catch {
      setStatus("error");
    }
  }

  return (
    <section
      className="section referral"
      id="referral"
      aria-labelledby="referral-title"
    >
      <div className="section__inner">
        <div className={open ? "referral__banner is-open" : "referral__banner"}>
          <div className="referral__media" aria-hidden="true">
            <Image
              className="referral__image referral__image--desktop"
              src="/media/referral/banner-desktop.jpg"
              alt=""
              fill
              sizes="(min-width: 640px) 100vw, 1px"
              priority={false}
            />
            <Image
              className="referral__image referral__image--mobile"
              src="/media/referral/banner-mobile.png"
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

                  <form className="referral__form" onSubmit={onSubmit} noValidate>
                    <div className="referral__fields">
                      <p className="referral__lead" id="referral-lead">
                        {nbspText(data.formLead)}
                      </p>

                      <label className="referral__field">
                        <span>{data.nameLabel}</span>
                        <input
                          ref={nameRef}
                          name="name"
                          type="text"
                          autoComplete="name"
                          className={invalid.name ? "is-invalid" : undefined}
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
                        <input
                          ref={phoneRef}
                          name="phone"
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          value={phone}
                          className={invalid.phone ? "is-invalid" : undefined}
                          onFocus={() => {
                            if (!nationalDigits(phone)) {
                              setPhone("+7");
                              window.setTimeout(() => {
                                phoneRef.current?.setSelectionRange(2, 2);
                              }, 0);
                            }
                          }}
                          onKeyDown={(e) => {
                            const el = e.currentTarget;
                            const start = el.selectionStart || 0;
                            const end = el.selectionEnd || 0;
                            if (
                              e.key === "Backspace" &&
                              start === end &&
                              start <= 2
                            ) {
                              e.preventDefault();
                            }
                            if (
                              e.key === "Delete" &&
                              start === end &&
                              start < 2
                            ) {
                              e.preventDefault();
                            }
                            if (
                              !nationalDigits(phone) &&
                              (e.key === "+" || e.key === "7" || e.key === "8")
                            ) {
                              e.preventDefault();
                            }
                          }}
                          onChange={(e) => {
                            const el = e.currentTarget;
                            const pos = el.selectionStart || 0;
                            const before = nationalBeforeCaret(el.value, pos);
                            const masked = maskPhone(el.value);
                            setPhone(masked);
                            setInvalid((prev) => ({ ...prev, phone: false }));
                            window.requestAnimationFrame(() => {
                              const next = caretAfterNational(masked, before);
                              el.setSelectionRange(next, next);
                            });
                          }}
                          required
                        />
                      </label>

                      <label className="referral__field">
                        <span>{data.emailLabel}</span>
                        <input
                          name="email"
                          type="email"
                          inputMode="email"
                          autoComplete="email"
                          className={invalid.email ? "is-invalid" : undefined}
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
                          required
                          onChange={() =>
                            setInvalid((prev) => ({ ...prev, rules: false }))
                          }
                        />
                        <span>
                          {data.rulesPrefix}
                          <a
                            className="referral__link"
                            href={data.rulesHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {data.rulesLabel}
                          </a>
                        </span>
                      </label>

                      <button
                        className="btn btn-yellow referral__submit"
                        type="submit"
                        disabled={status === "sending"}
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
                          {copy.leadError}
                        </p>
                      ) : null}
                    </div>

                    <div className="referral__ok" ref={okRef} aria-live="polite">
                      <div className="referral__ok-inner">
                        <div className="referral__ok-stage">
                          <div className="referral__ok-glow" aria-hidden="true" />
                          <svg
                            className="referral__ok-logo"
                            viewBox="0 0 588 555"
                            fill="none"
                            aria-hidden="true"
                          >
                            <path
                              fillRule="evenodd"
                              clipRule="evenodd"
                              d="M181.345 20.3661C122.956 12.3067 68.5903 52.8764 59.9143 110.981L20.6437 373.979C11.9677 432.085 52.2666 485.721 110.656 493.781L406.624 534.634C465.012 542.693 519.379 502.123 528.055 444.018L567.325 181.019C576.001 122.915 535.703 69.2782 477.313 61.2188L181.345 20.3661ZM40.6597 108.323C50.9158 39.637 115.184 -8.321 184.206 1.20597L480.174 42.0588C549.196 51.5858 596.834 114.991 586.578 183.677L547.308 446.675C537.051 515.363 472.785 563.321 403.763 553.794L107.795 512.94C38.7733 503.413 -8.86698 440.009 1.38912 371.323L40.6597 108.323Z"
                            />
                            <path
                              fillRule="evenodd"
                              clipRule="evenodd"
                              d="M324.185 194.485L373.341 217.143L373.04 424.549L423.763 424.622L424.114 183.943L324.185 133.507V194.485Z"
                            />
                            <path
                              fillRule="evenodd"
                              clipRule="evenodd"
                              d="M324.185 78.6493L166.925 156.958L166.536 424.257L220.498 424.334L220.649 321.185L273.531 321.262L273.381 424.41L324.106 424.484L324.185 370.529V78.6493ZM271.451 265.782L219.648 265.707L219.766 184.742L271.605 159.306L271.451 265.782Z"
                            />
                          </svg>
                          <svg
                            className="referral__ok-check"
                            viewBox="0 0 24 24"
                            fill="none"
                            aria-hidden="true"
                          >
                            <path
                              className="referral__ok-circle"
                              d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"
                            />
                            <path
                              className="referral__ok-tick"
                              d="M9 12l2 2l4 -4"
                            />
                          </svg>
                        </div>
                        <div className="referral__ok-copy">
                          <p className="referral__ok-title">{data.successTitle}</p>
                          <p className="referral__ok-text">
                            {nbspText(data.successBody)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>

          <p className="referral__foot">
            {data.rulesFooterPrefix}
            <a
              className="referral__link"
              href={data.rulesHref}
              target="_blank"
              rel="noopener noreferrer"
            >
              {data.rulesFooterLabel}
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
