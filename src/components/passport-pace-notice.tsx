"use client";

import { useEffect, useState } from 'react';
import type { PassportPace } from '../lib/passport-pace';
import './passport-pace-notice.css';

export function PassportPaceNotice() {
  const [kind, setKind] = useState<Exclude<PassportPace, 'ok'> | null>(null);
  useEffect(() => {
    const show = (event: Event) => {
      const detail = (event as CustomEvent<PassportPace>).detail;
      if (detail === 'nudge' || detail === 'banned') setKind(detail);
    };
    window.addEventListener('avgst:passport-pace', show);
    return () => window.removeEventListener('avgst:passport-pace', show);
  }, []);
  useEffect(() => {
    if (kind !== 'nudge') return;
    const timer = window.setTimeout(() => setKind(current => current === 'nudge' ? null : current), 6500);
    return () => window.clearTimeout(timer);
  }, [kind]);
  if (!kind) return null;
  return <div className="passport-pace" onClick={() => setKind(null)}>
    <p className="passport-pace__card" role="status">{kind === 'banned' ? 'Вам временно недоступно скачивание паспортов' : 'Нам не жалко, но ты бы хоть позвонил чтоли или написал'}</p>
  </div>;
}
