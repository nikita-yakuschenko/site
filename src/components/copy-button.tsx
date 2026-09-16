"use client";

import { useState } from "react";
import { IconCheck, IconCopy } from "@tabler/icons-react";
import { copy } from "../lib/copy";

/** Тихая кнопка «скопировать» — как надстрочный индекс у значения. */
export function CopyButton({ value }: { value: string }) {
  const [done, setDone] = useState(false);

  async function onClick() {
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      window.setTimeout(() => setDone(false), 1400);
    } catch {
      // Буфер недоступен — просто молчим.
    }
  }

  return (
    <button
      type="button"
      className={done ? "contact-copy is-done" : "contact-copy"}
      aria-label={done ? copy.copied : copy.copyValue}
      onClick={onClick}
    >
      {done ? (
        <IconCheck size={11} stroke={2} aria-hidden="true" />
      ) : (
        <IconCopy size={11} stroke={1.5} aria-hidden="true" />
      )}
    </button>
  );
}
