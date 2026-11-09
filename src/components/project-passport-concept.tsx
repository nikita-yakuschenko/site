"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { IconCheck, IconDownload, IconExclamationMark, IconLoader2, IconPlayerPlay } from '@tabler/icons-react';
import { PhoneInput } from './phone-input';
import { isValidRuMobile, phoneE164, maskPhone } from '../lib/phone';
import { readRegionCode } from '../lib/regions';
import './project-passport-concept.css';

const SUCCESS_MESSAGES = [
  'Вы на шаг ближе к мечте',
  'Отличное начало! Так держать!',
  'Мечта стала ближе',
  'Мечта стала ближе к реальности',
  'Первый шаг к мечте уже сделан',
  'Большая мечта. Хорошее начало!',
  'Вот так и начинается свой дом',
  'От мечты к своему дому',
  'Пусть всё начнётся с этого дома',
  'Вашей мечте пора сбываться',
];

/** Shared passport interaction for the project hero and its media viewers. */
export function ProjectPassportConcept({ project, projectSlug, placement = 'hero', active = true }: { project: string; projectSlug: string; placement?: 'hero' | 'viewer' | 'comparison'; active?: boolean }) {
  const formId = useId();
  const [run, setRun] = useState(0);
  const [slow, setSlow] = useState(false);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const storageKey = `avgst:passport-success:v1:${projectSlug}`;
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
    const frame = requestAnimationFrame(() => {
      try {
        const saved = window.localStorage.getItem(storageKey);
        if (saved && SUCCESS_MESSAGES.includes(saved)) { completedRef.current = true; setSuccessMessage(saved); setStatus('done'); setDismissed(true); }
      } catch { /* The current visit still keeps its completed state. */ }
      setStorageChecked(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [storageKey]);
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
    const sync = () => {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved && SUCCESS_MESSAGES.includes(saved)) { completedRef.current = true; setSuccessMessage(saved); setStatus('done'); setDismissed(true); setOpen(false); }
      } catch { /* Keep the current visit state. */ }
    };
    window.addEventListener('avgst:passport-completed', sync);
    return () => window.removeEventListener('avgst:passport-completed', sync);
  }, [storageKey]);
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
    if (!isValidRuMobile(phone) || busy.current || status === 'done') return;
    busy.current = true; setStatus('sending');
    // Start the minimum feedback interval after React can paint the busy state.
    const feedbackLap = new Promise<void>(resolve => requestAnimationFrame(() => setTimeout(resolve, 950)));
    requestId.current ??= crypto.randomUUID();
    try {
      const response = await fetch('/api/passport-concept', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: phoneE164(phone), project, slug: projectSlug, region: readRegionCode(), requestId: requestId.current }) });
      const receipt = await response.json();
      if (!response.ok || receipt.accepted !== true || !receipt.downloadUrl) throw new Error('not-accepted');
      const file = await fetch(receipt.downloadUrl);
      if (!file.ok) throw new Error('download-failed');
      const blob = await file.blob();
      await feedbackLap;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = receipt.filename || `AVGST_${projectSlug}.pdf`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      const message = SUCCESS_MESSAGES[Math.floor(Math.random() * SUCCESS_MESSAGES.length)]!;
      completedRef.current = true;
      setDismissed(!visibleRef.current);
      setSuccessMessage(message);
      try { window.localStorage.setItem(storageKey, message); } catch { /* Keep in memory. */ }
      setOpen(false);
      setStatus('done');
      window.dispatchEvent(new Event('avgst:passport-completed'));
      // Keep the submitting instance visible for its own success interval.
      setDismissed(!visibleRef.current);
    } catch { await feedbackLap; setStatus('error'); } finally { busy.current = false; }
  }
  function replay() { setOpen(false); setReady(false); setRun(value => value + 1); }
  return <>
    {imageReady && storageChecked && <div inert={dismissed} aria-hidden={dismissed} ref={containerRef} key={run} className={`passport-concept${placement === 'viewer' ? ' passport-concept--viewer' : ''}${placement === 'comparison' ? ' passport-concept--comparison' : ''}`} data-slow={slow} data-ready={ready} data-open={open} data-visible={inView && !dismissed} data-completed={status === 'done'}>
      <button inert={open || status === 'done'} aria-hidden={open || status === 'done'} className="passport-concept__button" type="button" aria-label="Скачать паспорт проекта" onAnimationEnd={event => { if ((event.animationName === 'passport-flight' || event.animationName === 'passport-fade')) setReady(true); }} onFocus={() => setReady(true)} onClick={() => { setOpen(true); requestAnimationFrame(() => phoneRef.current?.focus({ preventScroll: true })); }}>
        <span className="passport-concept__surface" aria-hidden="true" />
        <span className="passport-concept__label">Скачать паспорт проекта</span>
      </button>
      <form id={formId} inert={!open || status === 'done'} aria-hidden={!open || status === 'done'} className="passport-concept__form" data-status={status} onSubmit={send} aria-busy={status === 'sending'}>
        {status === 'sending' && <svg className="passport-concept__perimeter" aria-hidden="true"><rect x="1.5" y="1.5" rx="20" pathLength="100" /></svg>}
        <PhoneInput ref={phoneRef} aria-label="Номер телефона" name="phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onValueChange={value => { setPhone(value); if (status !== 'sending') setStatus('idle'); }} placeholder="Ваш телефон" disabled={status === 'sending' || status === 'done'} />

        <p className="passport-concept__note" aria-hidden={status === 'done'} inert={status === 'done'}>Нажимая скачать, вы соглашаетесь на <a href="/privacy" target="_blank" rel="noreferrer">обработку данных</a></p>
        <span className="passport-concept__announcement" role="status">{status === 'error' ? 'Не удалось отправить. Попробуйте ещё раз.' : status === 'done' ? 'Файл передан для скачивания' : ''}</span>
      </form>
      <div className="passport-concept__action-flight">        <button form={formId} inert={!open || status === 'done'} className="passport-concept__download" type="submit" disabled={!isValidRuMobile(phone) || status === 'sending' || status === 'done'} data-valid={isValidRuMobile(phone)} data-status={status} aria-label={status === 'sending' ? 'Подготовка скачивания' : status === 'done' ? 'Файл передан для скачивания' : status === 'error' ? 'Повторить скачивание' : 'Скачать PDF'} title={status === 'error' ? 'Не удалось скачать. Нажмите, чтобы повторить.' : undefined}>
          {status === 'sending' ? <IconLoader2 className="passport-concept__spinner" size={19} aria-hidden="true" /> : status === 'done' ? <IconCheck className="passport-concept__check" size={20} stroke={2.2} aria-hidden="true" /> : status === 'error' ? <IconExclamationMark size={20} aria-hidden="true" /> : <IconDownload size={19} aria-hidden="true" />}
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
