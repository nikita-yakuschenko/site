"use client";

import { useEffect, useRef, useState } from "react";
import { IconSearch, IconX } from "@tabler/icons-react";
import { copy } from "../lib/copy";

/**
 * Поиск по названию проекта.
 *
 * Название запоминается чаще, чем вид: человек помнит «Шведский 130», но не
 * узнает дом на фотографии. Без поиска ему остаётся листать каталог целиком.
 *
 * Набор ждёт паузы, иначе каждая буква била бы в сервер. Значение живёт в
 * адресе, как и весь прочий отбор: найденное можно переслать ссылкой.
 */

const TYPING_DELAY = 350;

export function CatalogSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Адрес мог смениться не отсюда: сброс всех условий, кнопка «назад».
     Тогда поле подтягивается за ним. Сверка идёт в рендере, а не эффектом:
     setState внутри эффекта вызывает лишний проход рендера. */
  const [seen, setSeen] = useState(value);
  if (seen !== value) {
    setSeen(value);
    setDraft(value);
  }

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const schedule = (next: string) => {
    setDraft(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(next), TYPING_DELAY);
  };

  const commitNow = (next: string) => {
    if (timer.current) clearTimeout(timer.current);
    setDraft(next);
    onChange(next);
  };

  return (
    <div className="catalog-search">
      <IconSearch size={18} stroke={2} aria-hidden="true" />
      <input
        type="search"
        value={draft}
        placeholder={copy.searchPlaceholder}
        aria-label={copy.searchAria}
        enterKeyHint="search"
        onChange={(event) => schedule(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") commitNow(draft);
          if (event.key === "Escape") commitNow("");
        }}
      />
      {draft ? (
        <button type="button" aria-label={copy.searchClear} onClick={() => commitNow("")}>
          <IconX size={16} stroke={2} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
