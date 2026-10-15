"use client";

import { IconArrowUpRight } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { LeadForm } from "./lead-form";
import { SITE } from "../lib/site";

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
}: {
  label: string;
  heading: string;
  submitLabel?: string;
  formId?: string;
  projectExternalId?: string;
  meta?: Record<string, unknown>;
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !rootRef.current) return;
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
    setOpen(next);
    onOpenChange?.(next);
  };

  return (
    /* Кнопка и форма — одна группа: между ними ничего не распахивается. */
    <div className="panel-lead" ref={rootRef}>
      {open ? null : (
        <button
          type="button"
          className="btn btn-yellow"
          onClick={() => setState(true)}
        >
          {label}
          <IconArrowUpRight size={16} stroke={2} aria-hidden="true" />
        </button>
      )}

      <div className="panel-lead__form" data-open={open ? "true" : "false"}>
        <div>
          <LeadForm formId={formId}
            siteId={SITE.id}
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
