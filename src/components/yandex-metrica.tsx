"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { bindMetricaFormGoals } from '../lib/metrica-form-goals';

/**
 * Счётчик Яндекс.Метрики — клиентская часть.
 *
 * Init и tag.js ставятся ранним сниппетом в layout <head>, до гидрации.
 * Здесь только SPA-hit при переходах и цели форм: иначе на тяжёлых
 * страницах (каталог) useEffect срабатывал бы после большого HTML.
 *
 * Если сниппет по какой-то причине не отработал — подстраховываем loadOnce.
 */

type YandexMetricaFn = ((...args: unknown[]) => void) & {
  a?: unknown[][];
  l?: number;
};

type MetricaWindow = Window & { ym?: YandexMetricaFn };

function loadOnce(counter: number): void {
  const w = window as MetricaWindow;
  if (w.ym) return;
  const src = `https://mc.yandex.ru/metrika/tag.js?id=${counter}`;
  for (const script of document.scripts) {
    if (script.src === src) return;
  }

  const ym = function (...args: unknown[]) {
    (ym.a = ym.a || []).push(args);
  } as YandexMetricaFn;
  ym.a = [];
  ym.l = Date.now();
  w.ym = ym;

  const script = document.createElement("script");
  script.async = true;
  script.src = src;
  document.head.appendChild(script);

  w.ym(counter, "init", {
    ssr: true,
    webvisor: true,
    clickmap: true,
    ecommerce: "dataLayer",
    referrer: document.referrer,
    url: location.href,
    accurateTrackBounce: true,
    trackLinks: true,
  });
}

export function YandexMetrica({ counter }: { counter: number }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!counter) return;
    loadOnce(counter);
    bindMetricaFormGoals((event, params) => {
      const ym = (window as MetricaWindow).ym;
      if (!ym) throw new Error('metrica-not-ready');
      ym(counter, 'reachGoal', event, params);
    });
  }, [counter]);

  /* Первый заход Метрика засчитывает сама при init (ранний сниппет),
     поэтому первый вызов эффекта пропускается. */
  const previous = useRef<string | null>(null);

  useEffect(() => {
    if (!counter) return;
    const query = searchParams.toString();
    const next = pathname + (query ? `?${query}` : "");
    const from = previous.current;
    previous.current = next;
    if (from === null) return;
    const w = window as MetricaWindow;
    w.ym?.(counter, "hit", next, { referer: from });
  }, [counter, pathname, searchParams]);

  return null;
}
