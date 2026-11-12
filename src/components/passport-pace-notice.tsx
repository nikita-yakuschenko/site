"use client";

import { useEffect, useState } from 'react';
import type { PassportNotice } from '../lib/passport-pace';
import './passport-pace-notice.css';

export function PassportPaceNotice() {
  const [kind, setKind] = useState<Exclude<PassportNotice, 'ok'> | null>(null);
  useEffect(() => {
    const show = (event: Event) => {
      const detail = (event as CustomEvent<PassportNotice>).detail;
      if (detail === 'nudge' || detail === 'banned' || detail === 'repeat' || detail === 'page-banned') setKind(detail);
    };
    window.addEventListener('avgst:passport-pace', show);
    return () => window.removeEventListener('avgst:passport-pace', show);
  }, []);
  useEffect(() => {
    if (kind !== 'nudge' && kind !== 'repeat') return;
    const timer = window.setTimeout(() => setKind(current => current === 'nudge' || current === 'repeat' ? null : current), 6500);
    return () => window.clearTimeout(timer);
  }, [kind]);
  if (!kind) return null;
  const text = kind === 'repeat'
    ? 'Вы уже получили этот паспорт'
    : kind === 'page-banned'
      ? 'Вам временно недоступно получение паспортов'
      : kind === 'banned'
        ? 'Вам временно недоступно получение паспортов'
        : 'Нам не жалко, но ты бы связался с нами, всё бы рассказали';
  return <div className="passport-pace" onClick={() => setKind(null)}>
    <p className="passport-pace__card" role="status">{text}</p>
  </div>;
}
