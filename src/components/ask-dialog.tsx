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
