"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { IconSearch, IconX } from "@tabler/icons-react";
import { copy } from "../lib/copy";
import { normalizeQuery } from "../lib/catalog/filters";

const TYPING_DELAY = 900;

type SearchState = {
  draft: string;
  seen: string;
  editing: boolean;
  revision: number;
  submitted: { query: string; revision: number } | null;
};

export function CatalogSearch({ value, onChange, pending = false, expanded = false, onApplied, onClose, inputRef }: {
  value: string;
  onChange: (next: string) => void;
  pending?: boolean;
  expanded?: boolean;
  onApplied?: () => void;
  onClose?: () => void;
  inputRef?: RefObject<HTMLInputElement | null>;
}) {
  const [state, setState] = useState<SearchState>({ draft: value, seen: value, editing: false, revision: 0, submitted: null });
  const input = useRef<HTMLInputElement>(null);
  const field = inputRef ?? input;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revision = useRef(0);
  const composing = useRef(false);
  const notified = useRef<SearchState['submitted']>(null);
  const latest = useRef({ value, pending, onChange, onApplied });
  useEffect(() => { latest.current = { value, pending, onChange, onApplied }; }, [value, pending, onChange, onApplied]);

  // A server response may acknowledge an older edit while the next word is
  // already being typed. Only an external change or our latest edit can sync.
  if (state.seen !== value) {
    const acknowledged = state.submitted?.query === value && state.submitted.revision === state.revision;
    setState({ ...state, seen: value, draft: state.editing ? state.draft : value, editing: acknowledged ? false : state.editing });
  }

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => {
    if (!expanded && window.matchMedia('(max-width: 1023px)').matches && document.activeElement === field.current) field.current?.blur();
  }, [expanded, field]);
  useEffect(() => {
    const sent = state.submitted;
    if (!pending && sent && sent.query === value && sent.revision === state.revision && notified.current !== sent) {
      notified.current = sent;
      latest.current.onApplied?.();
    }
  }, [pending, value, state.submitted, state.revision]);

  const commit = (next: string, edit: number) => {
    if (timer.current) clearTimeout(timer.current);
    const query = normalizeQuery(next);
    if (query === latest.current.value && !latest.current.pending) {
      setState(current => ({ ...current, editing: false, submitted: null }));
      latest.current.onApplied?.();
      return;
    }
    setState(current => ({ ...current, submitted: { query, revision: edit } }));
    latest.current.onChange(next);
  };
  const schedule = (next: string) => {
    const edit = ++revision.current;
    setState(current => ({ ...current, draft: next, revision: edit, editing: true }));
    if (timer.current) clearTimeout(timer.current);
    if (!composing.current) timer.current = setTimeout(() => commit(next, edit), TYPING_DELAY);
  };
  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
    setState(current => ({ ...current, draft: value, editing: false, submitted: null }));
    onClose?.();
  };

  return <div className="catalog-search" aria-busy={pending}>
    <IconSearch size={18} stroke={2} aria-hidden="true" />
    <input ref={field} type="search" value={state.draft} placeholder={copy.searchPlaceholder}
      aria-label={copy.searchAria} enterKeyHint="search"
      onChange={event => schedule(event.target.value)}
      onCompositionStart={() => {
        composing.current = true;
        const edit = ++revision.current;
        setState(current => ({ ...current, revision: edit, editing: true }));
        if (timer.current) clearTimeout(timer.current);
      }}
      onCompositionEnd={event => { composing.current = false; schedule(event.currentTarget.value); }}
      onKeyDown={event => {
        if (composing.current || event.nativeEvent.isComposing) return;
        if (event.key === 'Enter') { event.preventDefault(); commit(event.currentTarget.value, state.revision); }
        if (event.key === 'Escape') {
          if (expanded) cancel();
          else { schedule(''); commit('', revision.current); }
        }
      }} />
    {state.draft ? <button type="button" aria-label={copy.searchClear} onClick={() => {
      schedule(''); commit('', revision.current);
    }}><IconX size={16} stroke={1.75} aria-hidden="true" /></button> :
      expanded && onClose ? <button type="button" className="catalog-search__close" aria-label="Закрыть поиск" onClick={cancel}><IconX size={16} stroke={1.75} aria-hidden="true" /></button> : null}
  </div>;
}
