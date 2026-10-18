"use client";

import { useEffect } from "react";

/**
 * Счётчик Roistat. Грузится сразу, до баннера, как Метрика: номер визита
 * в cookie roistat_visit нужен с первого захода, иначе заявка не свяжется
 * с рекламным источником. Номер визита сервер прикладывает к заявке.
 *
 * Номер проекта публичный, тот же, что на старом сайте.
 */
const projectId = "a8d2dafd7f03641ecee21e18684113d2";
const host = "cloud.roistat.com";

type RoistatWindow = Window & { roistatProjectId?: string; roistatHost?: string; roistatPage?: string; roistatReferrer?: string };

export function RoistatCounter() {
  useEffect(() => {
    const w = window as RoistatWindow;
    if (w.roistatProjectId) return;
    // Параметры и адрес скрипта — как в сниппете из кабинета Roistat.
    w.roistatProjectId = projectId;
    w.roistatHost = host;
    w.roistatPage = location.href;
    w.roistatReferrer = document.referrer;
    const path = /^.*roistat_visit=[^;]+(.*)?$/.test(document.cookie)
      ? "/dist/module.js"
      : `/api/site/1.0/${projectId}/init?referrer=${encodeURIComponent(location.href)}`;
    const script = document.createElement("script");
    script.charset = "UTF-8";
    script.async = true;
    script.src = `https://${host}${path}`;
    document.head.appendChild(script);
  }, []);

  return null;
}
