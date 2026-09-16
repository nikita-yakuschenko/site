import { registerIntegration } from "../registry";

/**
 * Реестр интеграций. Реальные сторонние скрипты подключаются только
 * через init после consent; до согласия в layout их нет.
 */

registerIntegration({
  id: "smartcaptcha",
  category: "necessary",
  // Lazy load только на защищённых формах — глобально не подключать.
});

registerIntegration({
  id: "yandex-maps",
  category: "necessary",
  // Карта офиса/производства — necessary; грузится в OfficeMap без consent.
});

registerIntegration({
  id: "kinescope",
  category: "functional",
});

registerIntegration({
  id: "vk-video",
  category: "functional",
});

registerIntegration({
  id: "yandex-metrica",
  category: "analytics",
  init: async () => {
    // Placeholder: счётчик подключается после ENV NEXT_PUBLIC_YM_ID.
    const id = process.env.NEXT_PUBLIC_YM_ID;
    if (!id || typeof window === "undefined") return;
    // Не загружаем скрипт, пока нет явного ID и consent — init вызовут только при analytics=true.
    const w = window as Window & { ym?: (...args: unknown[]) => void };
    if (w.ym) return;
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://mc.yandex.ru/metrika/tag.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("ym load failed"));
      document.head.appendChild(script);
    });
    type YmQueue = { a?: unknown[][] } & ((...args: unknown[]) => void);
    const ym = function (...args: unknown[]) {
      (ym.a = ym.a || []).push(args);
    } as YmQueue;
    w.ym = ym;
    w.ym(Number(id), "init", {
      clickmap: true,
      trackLinks: true,
      accurateTrackBounce: true,
      webvisor: true,
      ecommerce: false,
    });
  },
  revoke: async () => {
    // First-party cleanup делает cleanupCategory('analytics').
  },
});

registerIntegration({
  id: "roistat",
  category: "analytics",
  init: async () => {
    const key = process.env.NEXT_PUBLIC_ROISTAT_ID;
    if (!key) return;
    // Adapter placeholder — без ID скрипт не грузим.
  },
});

registerIntegration({
  id: "avgst-analytics",
  category: "analytics",
  init: async () => {
    // Внутренняя analytics.avgst.ru — adapter до появления API.
  },
});

registerIntegration({
  id: "yandex-ads",
  category: "marketing",
  init: async () => {
    // MANUAL ACCOUNT CONFIGURATION REQUIRED — см. docs/cookie-consent.md
  },
});

registerIntegration({
  id: "vk-ads",
  category: "marketing",
  init: async () => {
    // Pixel ID отсутствует в проекте — placeholder.
  },
});
