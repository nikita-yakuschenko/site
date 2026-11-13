"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { IconBrandWhatsapp, IconCheck, IconExclamationMark, IconLoader2, IconPlayerPlay, IconSend } from '@tabler/icons-react';
import { PhoneInput } from './phone-input';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { isValidRuMobile, phoneE164, maskPhone } from '../lib/phone';
import { readRegionCode } from '../lib/regions';
import { trackMetricaFormSuccess } from '../lib/metrica-form-goals';
import { lockPassportDownload, markPageDownloaded, nextPageAttempt, notifyPassportPace, passportBanNotice, passportDevice, passportDwell, passportLeftFast, passportPaceDecision, rememberPassportDownload, rememberPassportHop, watchPassportLeave } from '../lib/passport-pace';
import './project-passport-concept.css';

const PASSPORT_CHANNELS = [
  { id: 'max', label: 'MAX', logo: '/social/max_original.svg' },
  { id: 'telegram', label: 'Telegram', logo: '/social/tg_original.svg' },
  { id: 'whatsapp', label: 'WhatsApp', logo: '' },
] as const;

const SUCCESS_MESSAGES = [
  'Заявка принята. Менеджер отправит паспорт сам',
  'Паспорт у менеджера. Он напишет вам',
  'Готово. Менеджер пришлёт паспорт в мессенджер',
];

/** Shared passport interaction for the project hero and its media viewers. */
export function ProjectPassportConcept({ project, projectSlug, placement = 'hero', active = true }: { project: string; projectSlug: string; placement?: 'hero' | 'viewer' | 'comparison'; active?: boolean }) {
  const formId = useId();
  const [run, setRun] = useState(0);
  const [slow, setSlow] = useState(false);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [channel, setChannel] = useState('');
  const [dismissed, setDismissed] = useState(false);
  const [storageChecked, setStorageChecked] = useState(false);
  const completedRef = useRef(false);
  const visibleRef = useRef(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const containerRef = useRef<HTMLDivElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const busy = useRef(false);
  const requestId = useRef<string | null>(null);
  const [inView, setInView] = useState(false);
  const [imageReady, setImageReady] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setStorageChecked(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    watchPassportLeave();
    passportDwell(projectSlug);
  }, [projectSlug]);
  useEffect(() => {
    if (placement !== 'hero') { const frame = requestAnimationFrame(() => setImageReady(true)); return () => cancelAnimationFrame(frame); }
    const image = document.querySelector<HTMLImageElement>('.project-hero__media img');
    if (!image || image.complete) { const frame = requestAnimationFrame(() => setImageReady(true)); return () => cancelAnimationFrame(frame); }
    const loaded = () => setImageReady(true);
    image.addEventListener('load', loaded, { once: true });
    image.addEventListener('error', loaded, { once: true });
    return () => { image.removeEventListener('load', loaded); image.removeEventListener('error', loaded); };
  }, [placement]);
  useEffect(() => {
    if (placement !== 'hero') {
      const frame = requestAnimationFrame(() => { visibleRef.current = active; setInView(active); if (!active) setOpen(false); });
      return () => cancelAnimationFrame(frame);
    }
    const hero = document.querySelector('.project-hero');
    if (!hero) return;
    let visible = false;
    const observer = new IntersectionObserver(([entry]) => {
      const next = Boolean(entry?.isIntersecting && entry.intersectionRatio >= .8);
      if (next === visible) return;
      visible = next;
      visibleRef.current = next;
      if (!next && completedRef.current) setDismissed(true);
      setInView(next);
      setOpen(false);
      if (next && !completedRef.current) { setReady(false); setRun(value => value + 1); }
    }, { threshold: [0, .8] });
    observer.observe(hero);
    return () => observer.disconnect();
  }, [placement, active]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      setOpen(false);
      requestAnimationFrame(() => containerRef.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true }));
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [open]);
  useEffect(() => {
    if (status !== 'done' || dismissed) return;
    const timer = window.setTimeout(() => setDismissed(true), 5000);
    return () => window.clearTimeout(timer);
  }, [status, dismissed]);
  useEffect(() => {
    if (!imageReady || !storageChecked) return;
    let stopped = false;
    let observer: ResizeObserver | undefined;
    void document.fonts.ready.then(() => {
      if (stopped) return;
      const container = containerRef.current;
      const input = phoneRef.current;
      const trigger = container?.querySelector<HTMLElement>('.passport-concept__button');
      const form = container?.querySelector<HTMLElement>('form');
      const action = container?.querySelector<HTMLElement>('.passport-concept__download');
      if (!container || !input || !trigger || !form || !action) return;
      const measure = () => {
        const context = document.createElement('canvas').getContext('2d');
        if (!context) return;
        const style = getComputedStyle(input);
        context.font = style.font;
        const widest = [...'0123456789'].sort((a, b) => context.measureText(b).width - context.measureText(a).width)[0]!;
        const mask = maskPhone('9'.repeat(10));
        const worst = mask.slice(0, 2) + mask.slice(2).replace(/\d/g, widest);
        const width = Math.ceil(context.measureText(worst).width + (parseFloat(style.letterSpacing) || 0) * (worst.length - 1)) + 3;
        const icon = action.offsetWidth;
        const total = width + parseFloat(getComputedStyle(form).paddingLeft) + parseFloat(getComputedStyle(form).gap) + icon + 6;
        container.style.setProperty('--passport-phone-width', `${width}px`);
        container.style.setProperty('--passport-form-width', `${total}px`);
        container.style.setProperty('--passport-form-scale', String(trigger.offsetWidth / total));
        container.style.setProperty('--passport-action-closed-x', `${(container.clientWidth - trigger.offsetWidth) / 2 + 5}px`);
        container.style.setProperty('--passport-action-open-x', `${(container.clientWidth + total) / 2 - 6 - icon}px`);
      };
      observer = new ResizeObserver(measure); observer.observe(container); observer.observe(trigger);
      measure();
    });
    return () => { stopped = true; observer?.disconnect(); };
  }, [imageReady, storageChecked, run]);
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isValidRuMobile(phone) || !PASSPORT_CHANNELS.some(item => item.id === channel) || busy.current || status === 'done') return;
    if (passportPaceDecision() === 'banned') { notifyPassportPace(passportBanNotice()); return; }
    const page = nextPageAttempt(projectSlug);
    if (page.downloaded) { notifyPassportPace('repeat'); return; }
    const pace = passportPaceDecision();
    if (pace === 'banned') { notifyPassportPace('banned'); return; }
    if (pace === 'nudge') notifyPassportPace('nudge');
    busy.current = true; setStatus('sending');
    // Start the minimum feedback interval after React can paint the busy state.
    const feedbackLap = new Promise<void>(resolve => requestAnimationFrame(() => setTimeout(resolve, 950)));
    requestId.current ??= crypto.randomUUID();
    try {
      passportDevice();
      const response = await fetch('/api/passport-concept', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: phoneE164(phone), project, slug: projectSlug, region: readRegionCode(), channel, requestId: requestId.current, dwellMs: passportDwell(projectSlug), leftFast: passportLeftFast(projectSlug) }) });
      const receipt = await response.json().catch(() => ({}));
      if (response.status === 429 || receipt.error === 'passport-banned') { lockPassportDownload('hour'); notifyPassportPace('banned'); await feedbackLap; setStatus('idle'); return; }
      if (!response.ok || receipt.accepted !== true) throw new Error('not-accepted');
      if (receipt.pace === 'nudge' || receipt.pace === 'joke') notifyPassportPace('nudge');
      if (receipt.lead === true) trackMetricaFormSuccess(String(receipt.id || requestId.current), 'project-passport');
      // Шуточный режим по-прежнему скачивает файл. Рабочий паспорт уходит менеджеру в Битрикс.
      if (receipt.pace === 'joke' && receipt.downloadUrl) {
        const file = await fetch(receipt.downloadUrl);
        if (!file.ok) throw new Error('download-failed');
        const blob = await file.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a'); link.href = url; link.download = receipt.filename || `AVGST_${projectSlug}.pdf`; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 30000);
      }
      rememberPassportDownload();
      rememberPassportHop(projectSlug);
      markPageDownloaded(projectSlug);
      await feedbackLap;
      const message = SUCCESS_MESSAGES[Math.floor(Math.random() * SUCCESS_MESSAGES.length)]!;
      completedRef.current = true;
      setDismissed(!visibleRef.current);
      setSuccessMessage(message);
      setOpen(false);
      setStatus('done');
      // Keep the submitting instance visible for its own success interval.
      setDismissed(!visibleRef.current);
    } catch { await feedbackLap; setStatus('error'); } finally { busy.current = false; }
  }
  function replay() { setOpen(false); setReady(false); setRun(value => value + 1); }
  return <>
    {imageReady && storageChecked && <div inert={dismissed} aria-hidden={dismissed} ref={containerRef} key={run} className={`passport-concept${placement === 'viewer' ? ' passport-concept--viewer' : ''}${placement === 'comparison' ? ' passport-concept--comparison' : ''}`} data-slow={slow} data-ready={ready} data-open={open} data-visible={inView && !dismissed} data-completed={status === 'done'}>
      <button inert={open || status === 'done'} aria-hidden={open || status === 'done'} className="passport-concept__button" type="button" aria-label="Получить паспорт проекта" onAnimationEnd={event => { if (event.animationName === 'passport-flight' || event.animationName === 'passport-fade' || event.animationName === 'passport-dialog-settle') setReady(true); }} onFocus={() => setReady(true)} onClick={() => { setOpen(true); requestAnimationFrame(() => phoneRef.current?.focus({ preventScroll: true })); }}>
        <span className="passport-concept__surface" aria-hidden="true" />
        <span className="passport-concept__label">Получить паспорт проекта</span>
      </button>
      <form id={formId} inert={!open || status === 'done'} aria-hidden={!open || status === 'done'} className="passport-concept__form" data-status={status} onSubmit={send} aria-busy={status === 'sending'}>
        {status === 'sending' && <svg className="passport-concept__perimeter" aria-hidden="true"><rect x="1.5" y="1.5" rx="20" pathLength="100" /></svg>}
        <PhoneInput ref={phoneRef} aria-label="Номер телефона" name="phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onValueChange={value => { setPhone(value); if (status !== 'sending') setStatus('idle'); }} placeholder="Ваш телефон" disabled={status === 'sending' || status === 'done'} />
        <div className="passport-concept__below">
          <div className="passport-concept__channel" data-shown={open && status !== 'done'} inert={!open || status === 'done'}>
            <div className="passport-concept__channel-clip">
              <fieldset className="passport-concept__channel-card">
                <p id={`${formId}-channel`} className="passport-concept__channel-title">Куда менеджеру написать?</p>
                <RadioGroup value={channel} onValueChange={setChannel} aria-labelledby={`${formId}-channel`} disabled={status === 'sending' || status === 'done'}>
                  {PASSPORT_CHANNELS.map(item => (
                    <label key={item.id} className="passport-concept__channel-option">
                      <RadioGroupItem value={item.id} />
                      {item.logo ? /* eslint-disable-next-line @next/next/no-img-element */ <img className="passport-concept__channel-logo" src={item.logo} width={18} height={18} alt="" /> : <IconBrandWhatsapp className="passport-concept__channel-logo passport-concept__channel-logo--whatsapp" size={18} stroke={1.7} aria-hidden="true" />}
                      <span>{item.label}</span>
                    </label>
                  ))}
                </RadioGroup>
              </fieldset>
            </div>
          </div>
          <p className="passport-concept__note" aria-hidden={status === 'done'} inert={status === 'done'}>Отправляя запрос, вы соглашаетесь на <a href="/privacy" target="_blank" rel="noreferrer">обработку данных</a></p>
        </div>
        <span className="passport-concept__announcement" role="status">{status === 'error' ? 'Не удалось отправить. Попробуйте ещё раз.' : status === 'done' ? 'Заявка принята' : ''}</span>
      </form>
      <div className="passport-concept__action-flight">        <button form={formId} inert={!open || status === 'done'} className="passport-concept__download" type="submit" disabled={!isValidRuMobile(phone) || !channel || status === 'sending' || status === 'done'} data-valid={isValidRuMobile(phone) && Boolean(channel)} data-status={status} aria-label={status === 'sending' ? 'Отправляем заявку' : status === 'done' ? 'Заявка принята' : status === 'error' ? 'Повторить запрос' : 'Получить паспорт'} title={status === 'error' ? 'Не удалось отправить заявку. Нажмите, чтобы повторить.' : undefined}>
          {status === 'sending' ? <IconLoader2 className="passport-concept__spinner" size={19} aria-hidden="true" /> : status === 'done' ? <IconCheck className="passport-concept__check" size={20} stroke={2.2} aria-hidden="true" /> : status === 'error' ? <IconExclamationMark size={20} aria-hidden="true" /> : <IconSend className="passport-concept__send" size={18} stroke={1.8} aria-hidden="true" />}
        </button>
      </div>
      {successMessage && <div className="passport-concept__success" role="status" onAnimationEnd={event => { if (event.animationName === 'passport-flight' || event.animationName === 'passport-fade') setReady(true); }}>
        <span className="passport-concept__success-text">{successMessage}</span>
        <span className="passport-concept__success-check"><IconCheck size={20} stroke={2.2} aria-hidden="true" /></span>
      </div>}
    </div>}
    {process.env.NODE_ENV === 'development' && placement === 'hero' && <aside className="passport-concept-tools" aria-label="Управление прототипом анимации">
      <span>PDF · прототип</span>
      <button type="button" onClick={replay}><IconPlayerPlay size={14} aria-hidden="true" />Повторить</button>
      <label><input type="checkbox" checked={slow} onChange={event => { setSlow(event.target.checked); replay(); }} />Замедлить ×3</label>
    </aside>}

  </>;
}
