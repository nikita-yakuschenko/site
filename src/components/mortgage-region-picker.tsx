"use client";

import { useId, useRef, useState } from 'react';
import { IconCheck, IconChevronDown } from '@tabler/icons-react';
import { mortgageRegionLabel, searchMortgageRegions } from './mortgage-regions';

export function MortgageRegionPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const options = searchMortgageRegions(query);
  function select(name: string) {
    onChange(name);
    setOpen(false);
    setQuery('');
  }
  function move(index: number) {
    const next = Math.max(0, Math.min(options.length - 1, index));
    setActive(next);
    list.current?.children[next]?.scrollIntoView({ block: 'nearest' });
  }
  return <div className="mortgage-region" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) { setOpen(false); setQuery(''); }
  }}>
    <div className="mortgage-region__field">
      <input ref={input} role="combobox" aria-label="Регион строительства" aria-autocomplete="list"
        aria-expanded={open} aria-controls={`${id}-list`} aria-activedescendant={open && options[active] ? `${id}-${active}` : undefined}
        autoComplete="off" value={open ? query : mortgageRegionLabel(value)} placeholder={mortgageRegionLabel(value)}
        onFocus={() => { setQuery(''); setActive(0); setOpen(true); }}
        onChange={event => { setQuery(event.target.value); setActive(0); setOpen(true); }}
        onKeyDown={event => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            if (!open) { setOpen(true); setQuery(''); setActive(0); }
            else move(active + (event.key === 'ArrowDown' ? 1 : -1));
          } else if (event.key === 'Enter' && open) {
            event.preventDefault();
            if (options[active]) select(options[active]);
          } else if (event.key === 'Escape') { event.preventDefault(); setOpen(false); setQuery(''); }
        }} />
      <button type="button" aria-label="Показать регионы" tabIndex={-1} onMouseDown={event => event.preventDefault()}
        onClick={() => { if (open) { setOpen(false); setQuery(''); } else { input.current?.focus(); setOpen(true); } }}>
        <IconChevronDown size={16} stroke={1.5} aria-hidden="true" />
      </button>
    </div>
    {open ? <div className="mortgage-region__popup">
      <div ref={list} id={`${id}-list`} role="listbox" aria-label="Регионы строительства" className="mortgage-region__list">
        {options.map((name, index) => <div key={name} id={`${id}-${index}`} role="option" aria-selected={name === value}
          className={`mortgage-region__option${index === active ? ' is-active' : ''}`}
          onMouseDown={event => event.preventDefault()} onMouseMove={() => setActive(index)} onClick={() => select(name)}>
          <span>{mortgageRegionLabel(name)}</span>{name === value ? <IconCheck size={14} aria-hidden="true" /> : null}
        </div>)}
      </div>
      {!options.length ? <p role="status" className="mortgage-region__empty">Регион не найден</p> : null}
    </div> : null}
  </div>;
}
