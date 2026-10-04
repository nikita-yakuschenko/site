"use client";

import { IconArrowUpRight, IconX } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { copy } from "../lib/copy";
import { LeadForm } from "./lead-form";
import { SITE } from "../lib/site";

/**
 * Форма поверх страницы.
 *
 * Один из двух способов запросить заявку на сайте. Второй — раскрытие на
 * месте, в том блоке, где нажали (LeadReveal). Диалог берут там, где
 * раскрывать негде: кнопка в шапке, короткая страница, конец баннера.
 *
 * Появился он вместо якоря «/#contacts»: тот с любой внутренней страницы
 * выбрасывал человека на главную и прокручивал в подвал — он терял то,
 * что читал, ради формы в три поля. Здесь он остаётся там же, где был.
 */
export function LeadDialog({
  onClose,
  heading = copy.askQuestion,
  body = copy.askDialogBody,
  submitLabel = copy.sendLead,
  pageId,
  meta,
}: {
  onClose: () => void;
  heading?: string;
  body?: string | null;
  submitLabel?: string;
  /** Откуда пришла заявка: страница сама себя и называет. */
  pageId?: string;
  meta?: Record<string, unknown>;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement : null;
    const focusable = () => Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]'
    ) ?? []).filter((element) => element.getClientRects().length > 0);
    focusable()[0]?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const elements = focusable();
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && (document.activeElement === first || !dialogRef.current?.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current?.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };

    /* Прокрутку прячем у корня, а не у body: полосу рисует именно он.
       Ширину полосы ничем не компенсируем — у корня стоит
       scrollbar-gutter: stable, место под полосу зарезервировано всегда, и
       добавочный отступ сдвигал бы страницу вбок, возмещая то, чего не
       происходит.

       Класс нужен, чтобы закрасить сам зазор: полоса спрятана, зазор
       остался, и в нём светился фон страницы белым краем вдоль затемнения.
       Фон корня уходит на холст, то есть и на зазор тоже. */
    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    root.style.overflow = "hidden";
    root.classList.add("is-dialog-open");

    window.addEventListener("keydown", onKey);
    return () => {
      root.style.overflow = prevOverflow;
      root.classList.remove("is-dialog-open");
      window.removeEventListener("keydown", onKey);
      previousFocus?.focus();
    };
  }, [onClose]);

  /* Рисуем в конце body, а не на месте вызова: окно лежит поверх всей
     страницы и не должно наследовать цвет текста и фон блока, из
     которого его открыли. На тёмном баннере производства форма иначе
     получала белые подписи на белой карточке. */
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="ask-dialog"
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={heading}
      onClick={onClose}
    >
      <div
        className="ask-dialog__card"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="ask-dialog__close"
          aria-label={copy.close}
          onClick={onClose}
        >
          <IconX size={18} stroke={2.2} />
        </button>
        <LeadForm
          siteId={SITE.id}
          pageId={pageId}
          variant="card"
          heading={heading}
          body={body}
          submitLabel={submitLabel}
          meta={meta}
        />
      </div>
    </div>,
    document.body,
  );
}

/**
 * Кнопка, открывающая эту форму.
 *
 * Нужна затем, что страницы у нас серверные, а состояние «открыто» —
 * клиентское. Без неё каждая страница заводила бы свой «use client»
 * ради одного useState, и способы вызвать форму снова разошлись бы.
 */
export function LeadDialogButton({
  label,
  className = "btn btn-yellow",
  withArrow = true,
  ...dialog
}: {
  label: string;
  className?: string;
  withArrow?: boolean;
  heading?: string;
  body?: string | null;
  submitLabel?: string;
  pageId?: string;
  meta?: Record<string, unknown>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {label}
        {withArrow ? (
          <IconArrowUpRight size={18} stroke={2} aria-hidden="true" />
        ) : null}
      </button>
      {open ? <LeadDialog {...dialog} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
