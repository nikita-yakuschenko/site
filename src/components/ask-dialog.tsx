"use client";

import { IconX } from "@tabler/icons-react";
import { useEffect } from "react";
import { copy } from "../lib/copy";
import { LeadForm } from "./lead-form";
import { SITE } from "../lib/site";

/**
 * Вопрос из шапки.
 *
 * Кнопка вела якорем на «/#contacts»: с любой внутренней страницы это
 * выбрасывало человека на главную и прокручивало в подвал — он терял то,
 * что читал, ради формы в три поля. Теперь форма открывается поверх
 * страницы, и после отправки он остаётся там же, где был.
 */
export function AskDialog({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    /* Прокрутку прячем у корня, а не у body: полосу рисует именно он, и
       при overflow на body её светлый трек оставался справа поверх
       затемнения. Ширину полосы возвращаем отступом, иначе страница под
       окном дёргается вбок. */
    const root = document.documentElement;
    const gap = window.innerWidth - root.clientWidth;
    const prevOverflow = root.style.overflow;
    const prevPadding = root.style.paddingRight;
    root.style.overflow = "hidden";
    if (gap > 0) {
      root.style.paddingRight = `${gap}px`;
      /* Ширину отдаём стилям: затемнение должно перекрыть и это поле,
         иначе справа остаётся светлая полоса. */
      root.style.setProperty("--scrollbar-gap", `${gap}px`);
    }

    window.addEventListener("keydown", onKey);
    return () => {
      root.style.overflow = prevOverflow;
      root.style.paddingRight = prevPadding;
      root.style.removeProperty("--scrollbar-gap");
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      className="ask-dialog"
      role="dialog"
      aria-modal="true"
      aria-label={copy.askQuestion}
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
          variant="card"
          heading={copy.askQuestion}
          body={copy.askDialogBody}
          submitLabel={copy.sendLead}
        />
      </div>
    </div>
  );
}
