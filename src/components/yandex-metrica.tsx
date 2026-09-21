"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Счётчик Яндекс.Метрики.
 *
 * Подключается при загрузке страницы. Статистика тогда охватывает весь
 * трафик, включая тех, кто ушёл, не дойдя до выбора в баннере: иначе эта
 * часть посетителей в отчёты не попадает вовсе.
 *
 * Параметры init и адрес скрипта — один в один как в сниппете из кабинета.
 * Отличий от него ровно два, и оба вынужденные:
 *
 * 1. Повторную установку ловим и по window.ym, и по адресу скрипта. Сниппет
 *    проверяет только адрес, но в строгом режиме разработки компонент
 *    монтируется дважды, и очередь успела бы затереться.
 *
 * 2. Переходы внутри приложения отправляются вручную. Сниппет рассчитан на
 *    обычный сайт, где каждая страница это новая загрузка документа. Здесь
 *    навигация идёт без перезагрузки, и без ручного hit в статистике
 *    остался бы один заход на весь визит.
 */

type YandexMetrica = ((...args: unknown[]) => void) & {
  a?: unknown[][];
  l?: number;
};

type MetricaWindow = Window & { ym?: YandexMetrica };

const COUNTER = Number(process.env.NEXT_PUBLIC_YM_ID);
const TAG_SRC = `https://mc.yandex.ru/metrika/tag.js?id=${COUNTER}`;

function loadOnce(): void {
  const w = window as MetricaWindow;
  if (w.ym) return;
  for (const script of document.scripts) {
    if (script.src === TAG_SRC) return;
  }

  /* Очередь объявляется до загрузки скрипта: tag.js, запустившись,
     разбирает накопленное. Наоборот не работает — вызов init лёг бы в
     массив, который никто не читает. */
  const ym = function (...args: unknown[]) {
    (ym.a = ym.a || []).push(args);
  } as YandexMetrica;
  ym.a = [];
  ym.l = Date.now();
  w.ym = ym;

  const script = document.createElement("script");
  script.async = true;
  script.src = TAG_SRC;
  document.head.appendChild(script);

  w.ym(COUNTER, "init", {
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

export function YandexMetrica() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!COUNTER) return;
    loadOnce();
  }, []);

  /* Первый заход Метрика засчитывает сама при init, поэтому первый вызов
     эффекта пропускается: иначе вход считался бы дважды. Адрес прошлой
     страницы уходит как referer, без него у всех переходов внутри сайта
     источник был бы пустым. */
  const previous = useRef<string | null>(null);

  useEffect(() => {
    if (!COUNTER) return;
    const query = searchParams.toString();
    const next = pathname + (query ? `?${query}` : "");
    const from = previous.current;
    previous.current = next;
    if (from === null) return;
    const w = window as MetricaWindow;
    w.ym?.(COUNTER, "hit", next, { referer: from });
  }, [pathname, searchParams]);

  return null;
}
