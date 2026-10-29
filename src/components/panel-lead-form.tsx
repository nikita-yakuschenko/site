"use client";

import { IconArrowUpRight, IconX } from "@tabler/icons-react";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { LeadForm } from "./lead-form";
import { SITE } from "../lib/site";
import { copy } from "../lib/copy";
import { isMobileFormViewport, useMobileFormReveal } from './use-mobile-form-reveal';

const REVEAL_MS = 600;
const REVEAL_MARGIN = 24;

// Форма растёт вниз и уходит за край экрана. Пока длится её появление,
// страница догоняет нижний край, чтобы поля не раскрывались вслепую.
function revealLead(anchor: HTMLElement) {
  const rect = anchor.getBoundingClientRect();
  const delta = rect.bottom - (window.innerHeight - REVEAL_MARGIN);
  if (delta < 1) return;
  let parent = anchor.parentElement;
  while (parent) {
    const style = getComputedStyle(parent);
    if (/(auto|scroll)/.test(style.overflowY) && parent.scrollHeight > parent.clientHeight + 1) {
      parent.scrollTop += delta;
      return;
    }
    parent = parent.parentElement;
  }
  window.scrollBy(0, delta);
}

/**
 * Форма внутри итоговой панели.
 *
 * Третий из способов запросить заявку — после окна поверх страницы
 * (LeadDialog) и подмены на месте (LeadReveal). Здесь формы нет, пока её
 * не позвали: панель маленькая, и она вырастает под форму на глазах.
 * Подменить содержимое, как в баннере, нельзя — форма выше кнопки, и
 * подстановка рванула бы высоту рывком.
 *
 * Панель обычно ещё и меняет вид, пока в ней заполняют поля: про это
 * сообщает onOpenChange, а как именно — решает сама панель.
 */
export function PanelLeadForm({
  label,
  heading,
  submitLabel,
  formId = "project-configuration",
  projectExternalId,
  meta,
  onOpenChange,
  formIntro,
  closable = false,
  siteId = SITE.id,
  animateTrigger = false,
  open: controlledOpen,
}: {
  label: string;
  heading: string;
  submitLabel?: string;
  formId?: string;
  projectExternalId?: string;
  meta?: Record<string, unknown>;
  onOpenChange?: (open: boolean) => void;
  formIntro?: ReactNode;
  closable?: boolean;
  siteId?: number | string;
  animateTrigger?: boolean;
  open?: boolean;
}) {
  const [localOpen, setOpen] = useState(false);
  const open = controlledOpen ?? localOpen;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(open);
  useMobileFormReveal(open, rootRef);

  useLayoutEffect(() => {
    if (open && !isMobileFormViewport()) {
      rootRef.current?.querySelector<HTMLInputElement>('.panel-lead__form input:not([type="hidden"])')?.focus({ preventScroll: true });
    } else if (wasOpen.current) {
      triggerRef.current?.focus({ preventScroll: true });
    }
    wasOpen.current = open;
  }, [open]);

  useEffect(() => {
    if (!open || !rootRef.current || isMobileFormViewport()) return;
    const anchor = rootRef.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      revealLead(anchor);
      return;
    }
    const start = performance.now();
    let frame = 0;
    const follow = (now: number) => {
      revealLead(anchor);
      if (now - start < REVEAL_MS) frame = requestAnimationFrame(follow);
    };
    frame = requestAnimationFrame(follow);
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const setState = (next: boolean) => {
    const focused = document.activeElement;
    if (focused instanceof HTMLElement && rootRef.current?.contains(focused)) focused.blur();
    setOpen(next);
    onOpenChange?.(next);
  };

  return (
    /* Кнопка и форма — одна группа: между ними ничего не распахивается. */
    <div className="panel-lead" ref={rootRef}>
      {animateTrigger ? (
        <div className="panel-lead__trigger" data-open={!open} inert={open} aria-hidden={open}>
          <div><button ref={triggerRef} type="button" className="btn btn-yellow" aria-expanded={open} onClick={() => setState(true)}>
            {label}<IconArrowUpRight size={16} stroke={2} aria-hidden="true" />
          </button></div>
        </div>
      ) : open ? null : (
        <button ref={triggerRef} type="button" className="btn btn-yellow" aria-expanded={false} onClick={() => setState(true)}>
          {label}<IconArrowUpRight size={16} stroke={2} aria-hidden="true" />
        </button>
      )}

      <div className="panel-lead__form" data-open={open ? "true" : "false"} inert={!open} aria-hidden={!open}>
        <div>
          {closable ? <button type="button" className="panel-lead__close" aria-label={copy.close} onClick={() => setState(false)}><IconX size={14} stroke={2.4} aria-hidden="true" /></button> : null}
          {formIntro}
          <LeadForm active={open} formId={formId}
            siteId={siteId}
            projectExternalId={projectExternalId}
            variant="card"
            compact
            heading={heading}
            submitLabel={submitLabel ?? label}
            meta={meta}
          />
        </div>
      </div>
    </div>
  );
}
