"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { IconArrowRight, IconArrowUpRight, IconX } from "@tabler/icons-react";
import { LeadForm } from "./lead-form";
import { RangeSlider } from "./range-slider";
import { noAutofillFieldProps } from "../lib/no-autofill";
import { copy } from "../lib/copy";
import { SITE } from "../lib/site";

const phrases = [
  "Хочу террасу побольше, чтобы по утрам наслаждаться ароматным кофе.",
  "Хочу гостиную побольше, чтобы собираться всей семьёй за одним большим столом.",
  "Хочу отдельный кабинет и сауну, чтобы работать дома и париться, не выезжая никуда.",
  "Хочу две детские рядом, а нашу спальню тихую и подальше от гостиной.",
  "Хочу кухню отдельно от гостиной: готовлю часто, а запахи по всему дому не хочу.",
  "Хочу комнату для гостей, чтобы родители оставались на выходные и не спали на диване.",
  "Хочу гардеробную и постирочную рядом с санузлом, чтобы вещи не жили по стульям.",
  "Хочу тёплый тамбур на входе, чтобы зимой холод оставался за дверью.",
  "Хочу второй свет над гостиной и широкое окно прямо на террасу.",
  "Хочу спальню со своим санузлом и окном в сад, а не в сторону дороги.",
];

const examplePrefix = "Опишите пожелания, например: ";

function useTypedExample(active: boolean) {
  const [text, setText] = useState(examplePrefix);
  useEffect(() => {
    if (!active) return;
    const start = Math.floor(Math.random() * phrases.length);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setText(`${examplePrefix}${phrases[start]}`);
      return;
    }
    let index = start;
    let count = 0;
    let deleting = false;
    let timer = 0;
    const step = () => {
      const full = phrases[index]!;
      if (!deleting) {
        count = Math.min(full.length, count + 1);
        setText(`${examplePrefix}${full.slice(0, count)}`);
        if (count === full.length) {
          timer = window.setTimeout(() => {
            deleting = true;
            step();
          }, 2400);
          return;
        }
        timer = window.setTimeout(step, 95);
        return;
      }
      count = Math.max(0, count - 1);
      setText(`${examplePrefix}${full.slice(0, count)}`);
      if (count === 0) {
        deleting = false;
        index = (index + 1) % phrases.length;
        timer = window.setTimeout(step, 500);
        return;
      }
      timer = window.setTimeout(step, 32);
    };
    timer = window.setTimeout(step, 500);
    return () => window.clearTimeout(timer);
  }, [active]);
  return active ? text : examplePrefix;
}

const areaMin = 40;
const areaMax = 200;
const stepCount = 2;

function toggle(current: number[], value: number) {
  return current.includes(value) ? current.filter((item) => item !== value) : [...current, value].sort((a, b) => a - b);
}

/**
 * Карточка под экспликацией: человек отмечает площадь и комнаты так же,
 * как в фильтрах каталога, и пишет, что хочет изменить.
 */
const SLIDE_MS = 550;
const STEP_MS = 420;
const STEP_EASE = "cubic-bezier(.22,.61,.36,1)";

export function PlanChangePrompt({ planLabel }: { planLabel?: string }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const paneRef = useRef<HTMLDivElement>(null);
  const fromRef = useRef(0);
  const closedTop = useRef(0);
  const dirRef = useRef(0);
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const liveRef = useRef<HTMLDivElement>(null);
  const restRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [area, setArea] = useState<[number, number]>([areaMin, areaMax]);
  const [areaMoved, setAreaMoved] = useState(false);
  const [floors, setFloors] = useState<number[]>([]);
  const [bedrooms, setBedrooms] = useState<number[]>([]);
  const [bathrooms, setBathrooms] = useState<number[]>([]);
  const [wish, setWish] = useState("");
  const [wishFocus, setWishFocus] = useState(false);
  const example = useTypedExample(open && step === 1 && wish.length === 0 && !wishFocus);

  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
        setStep(1);
        return;
      }
      setClosing(true);
      return;
    }
    const card = cardRef.current;
    const side = sideOf();
    closedTop.current = card?.offsetTop ?? 0;
    if (side) side.style.minHeight = `${side.offsetHeight}px`;
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
    if (!card || reduced()) return;
    const rise = Math.max(0, closedTop.current - card.offsetTop);
    fromRef.current = rise;
    if (rise < 8) return;
    card.animate(
      [{ transform: `translateY(${rise}px)` }, { transform: "translateY(0)" }],
      { duration: SLIDE_MS, easing: "cubic-bezier(.22,.61,.36,1)" },
    );
  }, [open]);

  // Закрытие: свёрнутый текст проявляется, пока карточка ещё едет, и в конце уже нечем переключаться.
  useLayoutEffect(() => {
    if (!closing) return;
    const card = cardRef.current;
    const live = liveRef.current;
    const rest = restRef.current;
    const from = fromRef.current;
    if (!card || !live || !rest || from < 8) {
      setOpen(false);
      setStep(1);
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
      setStep(1);
      setClosing(false);
    };
    fade.onfinish = finish;
    return () => {
      move.cancel();
      hide.cancel();
      fade.cancel();
    };
  }, [closing]);

  const go = (next: 1 | 2) => {
    if (next === step) return;
    dirRef.current = next > step ? 1 : -1;
    setStep(next);
  };
  // Сдвиг шага: вперёд уходит влево, назад — вправо.
  useLayoutEffect(() => {
    if (!open) {
      dirRef.current = 0;
      return;
    }
    const dir = dirRef.current;
    const pane = paneRef.current;
    if (!dir || !pane || reduced()) return;
    const outgoing = pane.querySelector(':scope > [data-on="false"]') as HTMLElement | null;
    const incoming = pane.querySelector(':scope > [data-on="true"]') as HTMLElement | null;
    if (!outgoing || !incoming) return;
    const dx = Math.max(28, Math.round(pane.offsetWidth * 0.22));
    const clear = (el: HTMLElement) => {
      el.style.visibility = "";
      el.style.opacity = "";
      el.style.transform = "";
    };
    incoming.style.visibility = "visible";
    incoming.style.opacity = "0";
    incoming.style.transform = `translateX(${dir * dx}px)`;
    outgoing.style.visibility = "visible";
    outgoing.style.opacity = "1";
    outgoing.style.transform = "translateX(0)";
    let stop = () => {};
    const frame = requestAnimationFrame(() => {
      dirRef.current = 0;
      const leave = outgoing.animate(
        [{ transform: "translateX(0)", opacity: 1 }, { transform: `translateX(${-dir * dx}px)`, opacity: 0 }],
        { duration: STEP_MS, easing: STEP_EASE, fill: "forwards" },
      );
      const enter = incoming.animate(
        [{ transform: `translateX(${dir * dx}px)`, opacity: 0 }, { transform: "translateX(0)", opacity: 1 }],
        { duration: STEP_MS, easing: STEP_EASE, fill: "forwards" },
      );
      let settled = false;
      const settle = () => {
        if (settled) return;
        settled = true;
        if (incoming.isConnected) clear(incoming);
        if (outgoing.isConnected) clear(outgoing);
        leave.cancel();
        enter.cancel();
      };
      enter.onfinish = settle;
      stop = settle;
    });
    return () => {
      cancelAnimationFrame(frame);
      stop();
      if (incoming.isConnected) clear(incoming);
      if (outgoing.isConnected) clear(outgoing);
    };
  }, [open, step]);

  const lines = [
    planLabel ? `Планировка: ${planLabel}` : "",
    areaMoved ? `Площадь: ${area[0]}-${area[1]} м²` : "",
    floors.length ? `Этажи: ${floors.join(", ")}` : "",
    bedrooms.length ? `Спальни: ${bedrooms.join(", ")}` : "",
    bathrooms.length ? `Санузлы: ${bathrooms.join(", ")}` : "",
    wish.trim(),
  ].filter(Boolean);

  return (
    <div className="plan-change" ref={cardRef} data-form={open ? "true" : "false"} data-closing={closing ? "true" : "false"}>
      {open && closing ? <div className="plan-change__rest" ref={restRef}><Teaser onOpen={() => show(true)} /></div> : null}
      {open ? <div className="plan-change__live" ref={liveRef}>
      <button type="button" className="plan-change__close" aria-label={copy.close} onClick={() => show(false)}><IconX size={14} stroke={2.4} aria-hidden="true" /></button>
      <div className="plan-change__steps">
        <button type="button" className="plan-change__back" data-on={step === 2} aria-hidden={step !== 2} tabIndex={step === 2 ? 0 : -1} onClick={() => go(1)}>Назад</button>
        <div className="plan-change__bars" role="progressbar" aria-valuemin={1} aria-valuemax={stepCount} aria-valuenow={step} aria-label={`Шаг ${step} из ${stepCount}`}>
          {Array.from({ length: stepCount }, (_, index) => {
            const n = index + 1;
            const state = n < step ? "done" : n === step ? "active" : "next";
            return <span key={n} data-state={state} />;
          })}
        </div>
        <p key={step} className="plan-change__step">Шаг {step} из {stepCount}</p>
      </div>
      <div className="plan-change__pane" ref={paneRef}>
      <div className="plan-change-form" data-on={step === 1} inert={step !== 1}>
        <p className="plan-change__title">Расскажите нам о своих пожеланиях</p>
        <fieldset className="cfilter__group">
          <legend className="cfilter__legend">Площадь<span>{area[0]}-{area[1]} м²</span></legend>
          <RangeSlider min={areaMin} max={areaMax} value={area} labels={["Площадь от", "Площадь до"]} onChange={(next) => {
            setArea([next[0] ?? areaMin, next[1] ?? areaMax]);
            setAreaMoved(true);
          }} />
        </fieldset>
        <Count legend="Количество этажей" values={[1, 2]} active={floors} onToggle={(value) => setFloors((current) => toggle(current, value))} />
        <Count legend="Количество спален" values={[1, 2, 3, 4]} active={bedrooms} onToggle={(value) => setBedrooms((current) => toggle(current, value))} />
        <Count legend="Количество санузлов" values={[1, 2]} active={bathrooms} onToggle={(value) => setBathrooms((current) => toggle(current, value))} />
        <div className="plan-change__wish">
          {wish.length === 0 && !wishFocus ? <div className="plan-change__ghost" aria-hidden="true"><span className="plan-change__mark">Опишите пожелания, например:</span> {example.startsWith(examplePrefix) ? example.slice(examplePrefix.length) : ""}<span className="plan-change__caret" /></div> : null}
          <textarea rows={4} value={wish} placeholder="" aria-label="Пожелания к планировке" className="ym-disable-keys ym-hide-content" {...noAutofillFieldProps} onPointerDown={() => setWishFocus(true)} onFocus={() => setWishFocus(true)} onBlur={() => setWishFocus(false)} onChange={(event) => setWish(event.target.value)} />
        </div>
        <button type="button" className="btn btn-yellow plan-change__open" onClick={() => go(2)}>Дальше<IconArrowRight size={18} stroke={2} aria-hidden="true" /></button>
      </div>
      <div className="plan-change-form" data-on={step === 2} inert={step !== 2}>
      <p className="plan-change__title">Давайте познакомимся!</p>
      <LeadForm active={step === 2} siteId={SITE.id} formId="plan-change" variant="card" compact nameLabel="Ваше имя" heading="Хотите изменить планировку?" submitLabel="Жду звонка" successText="Заявка принята. Перезвоним и разберём планировку." meta={{
        planLabel: planLabel || undefined,
        ...(areaMoved ? { areaFrom: area[0], areaTo: area[1] } : {}),
        ...(floors.length ? { floors } : {}),
        ...(bedrooms.length ? { bedrooms } : {}),
        ...(bathrooms.length ? { bathrooms } : {}),
      }}>
        <input type="hidden" name="message" value={lines.join("\n")} />
      </LeadForm>
      </div>
      </div>
      </div> : <Teaser onOpen={() => show(true)} />}
    </div>
  );
}

function Teaser({ onOpen }: { onOpen: () => void }) {
  return (
    <>
      <p className="plan-change__title">Хотите изменить планировку?</p>
      <p className="plan-change__text">Расскажите нам о своих пожеланиях, мы обязательно подберём решение</p>
      <button type="button" className="btn btn-yellow plan-change__open" onClick={onOpen}>Обсудить планировку<IconArrowUpRight size={18} stroke={2} aria-hidden="true" /></button>
    </>
  );
}

function Count({ legend, values, active, onToggle }: { legend: string; values: number[]; active: number[]; onToggle: (value: number) => void }) {
  return (
    <fieldset className="cfilter__group">
      <legend className="cfilter__legend">{legend}</legend>
      <div className="cfilter__badges">
        {values.map((value) => (
          <button key={value} type="button" className={active.includes(value) ? "is-on" : undefined} aria-pressed={active.includes(value)} onClick={() => onToggle(value)}>
            {value}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
