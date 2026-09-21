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
  /* Счётчик здесь больше не подключается: он грузится сразу, до баннера,
     компонентом YandexMetrica в layout. Иначе в статистику не попадают
     ровно те, ради кого её и смотрят, — ушедшие, не приняв куки.
     Запись оставлена, чтобы очистка при отзыве согласия по-прежнему знала
     про категорию: ключи _ym_* перечислены в cleanup.ts. */
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
