"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { IconArrowUpRight, IconX } from "@tabler/icons-react";
import { LeadForm } from "./lead-form";
import { useMobileFormReveal } from "./use-mobile-form-reveal";
import { copy } from "../lib/copy";
import { SITE } from "../lib/site";

const SLIDE_MS = 550;
const TITLE = "Хотите изменить или подобрать другую планировку?";

/**
 * Карточка под экспликацией: тизер и типовая заявка (имя + телефон).
 * Многовариабельная форма временно отключена — см. блок внизу файла.
 */
export function PlanChangePrompt({ planLabel }: { planLabel?: string }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const fromRef = useRef(0);
  const closedTop = useRef(0);
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  useMobileFormReveal(open, cardRef);
  const liveRef = useRef<HTMLDivElement>(null);
  const restRef = useRef<HTMLDivElement>(null);

  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const wide = () => window.matchMedia("(min-width: 900px)").matches;
  const sideOf = () => {
    const parent = cardRef.current?.parentElement;
    return parent?.classList.contains("project-plans__side") ? parent : null;
  };
  const show = (next: boolean) => {
    if (!next) {
      if (closing) return;
      const from = fromRef.current;
      if (!cardRef.current || from < 8 || reduced()) {
        setOpen(false);
        return;
      }
      setClosing(true);
      return;
    }
    const card = cardRef.current;
    const side = sideOf();
    closedTop.current = card?.offsetTop ?? 0;
    if (side && wide()) side.style.minHeight = `${side.offsetHeight}px`;
    setOpen(true);
  };
  useLayoutEffect(() => {
    if (!open) {
      cardRef.current?.getAnimations().forEach((item) => item.cancel());
      const side = sideOf();
      if (side) side.style.minHeight = "";
      return;
    }
    const card = cardRef.current;
    if (!card || reduced() || !wide()) return;
    const rise = Math.max(0, closedTop.current - card.offsetTop);
    fromRef.current = rise;
    if (rise < 8) return;
    card.animate(
      [{ transform: `translateY(${rise}px)` }, { transform: "translateY(0)" }],
      { duration: SLIDE_MS, easing: "cubic-bezier(.22,.61,.36,1)" },
    );
  }, [open]);

  // Закрытие: свёрнутый текст проявляется, пока карточка ещё едет.
  useLayoutEffect(() => {
    if (!closing) return;
    const card = cardRef.current;
    const live = liveRef.current;
    const rest = restRef.current;
    const from = fromRef.current;
    if (!card || !live || !rest || from < 8 || !wide()) {
      setOpen(false);
      setClosing(false);
      return;
    }
    card.getAnimations().forEach((item) => item.cancel());
    const easing = "cubic-bezier(.22,.61,.36,1)";
    const duration = 420;
    rest.style.opacity = "0";
    const move = card.animate(
      [{ transform: "translateY(0)" }, { transform: `translateY(${from}px)` }],
      { duration, easing, fill: "forwards" },
    );
    const hide = live.animate(
      [{ opacity: 1 }, { opacity: 0, offset: 0.55 }, { opacity: 0 }],
      { duration, easing, fill: "forwards" },
    );
    const fade = rest.animate(
      [{ opacity: 0 }, { opacity: 1, offset: 0.55 }, { opacity: 1 }],
      { duration, easing, fill: "forwards" },
    );
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      setOpen(false);
      setClosing(false);
    };
    fade.onfinish = finish;
    return () => {
      move.cancel();
      hide.cancel();
      fade.cancel();
    };
  }, [closing]);

  // На десктопе картинка не ниже открытой формы.
  useLayoutEffect(() => {
    const card = cardRef.current;
    const measure = measureRef.current;
    const sheet = card?.closest(".project-plans__body")?.querySelector(".project-plans__sheet");
    if (!(sheet instanceof HTMLElement)) return;
    const apply = () => {
      const side = card?.parentElement;
      if (!wide() || !measure) {
        sheet.style.minHeight = "";
        if (side?.classList.contains("project-plans__side")) side.style.minHeight = "";
        return;
      }
      const live = card?.dataset.form === "true" ? card.offsetHeight : 0;
      const height = Math.max(measure.offsetHeight, live);
      if (height > 0) sheet.style.minHeight = `${Math.ceil(height)}px`;
    };
    apply();
    const observer = new ResizeObserver(apply);
    if (measure) observer.observe(measure);
    if (card) observer.observe(card);
    window.addEventListener("resize", apply);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", apply);
    };
  }, [open]);

  const formBody = (measure: boolean) => (
    <>
      <button type="button" className="plan-change__close" aria-label={copy.close} tabIndex={measure ? -1 : 0} onClick={() => { if (!measure) show(false); }}><IconX size={14} stroke={2.4} aria-hidden="true" /></button>
      <p className="plan-change__title">{TITLE}</p>
      <LeadForm
        active={!measure && open}
        siteId={SITE.id}
        formId={measure ? "plan-change-measure" : "plan-change"}
        variant="card"
        compact
        nameLabel="Ваше имя"
        heading={TITLE}
        submitLabel="Жду звонка"
        successText="Заявка принята. Перезвоним и разберём планировку."
        meta={{ planLabel: planLabel || undefined }}
      />
    </>
  );

  return (
    <div className="plan-change" ref={cardRef} data-form={open ? "true" : "false"} data-closing={closing ? "true" : "false"}>
      <div className="plan-change plan-change__measure" data-form="true" ref={measureRef} aria-hidden="true" inert>{formBody(true)}</div>
      {open && closing ? <div className="plan-change__rest" ref={restRef}><Teaser onOpen={() => show(true)} /></div> : null}
      <div className="plan-change__teaser" inert={open} aria-hidden={open}><div><Teaser onOpen={() => show(true)} /></div></div>
      <div className="plan-change__live" ref={liveRef} inert={!open} aria-hidden={!open}><div>{formBody(false)}</div></div>
    </div>
  );
}

function Teaser({ onOpen }: { onOpen: () => void }) {
  return (
    <>
      <p className="plan-change__title">{TITLE}</p>
      <button type="button" className="btn btn-yellow plan-change__open" onClick={onOpen}>Обсудить изменения<IconArrowUpRight size={18} stroke={2} aria-hidden="true" /></button>
    </>
  );
}

/*
 * Многовариабельная формулировка временно отключена.
 * Было: шаг 1 — площадь / этажи / спальни / санузлы / пожелания (с печатью примеров),
 * шаг 2 — LeadForm с meta из выбранных параметров.
 * Восстановить целиком: git show 9a14b4f:src/components/plan-change-prompt.tsx
 *
 * Фрагмент formBody (ориентир):
 *
 * <div className="plan-change__steps">…Шаг {step} из 2…</div>
 * <div className="plan-change__pane">
 *   <div data-on={step === 1}>
 *     RangeSlider площадь, Count этажи/спальни/санузлы, textarea wish, «Дальше»
 *   </div>
 *   <div data-on={step === 2}>
 *     LeadForm + hidden message из lines
 *   </div>
 * </div>
 */
