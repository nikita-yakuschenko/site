"use client";

import { IconArrowUpRight } from "@tabler/icons-react";
import { useState } from "react";
import { LeadForm } from "./lead-form";
import { SITE } from "../lib/site";

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
  projectExternalId,
  meta,
  onOpenChange,
}: {
  label: string;
  heading: string;
  submitLabel?: string;
  projectExternalId?: string;
  meta?: Record<string, unknown>;
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);

  const setState = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
  };

  return (
    /* Кнопка и форма — одна группа: между ними ничего не распахивается. */
    <div className="panel-lead">
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
          <LeadForm
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
