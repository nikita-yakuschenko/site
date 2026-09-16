# Cookie Consent Management (AV4)

Система управления согласием на cookie и сторонние технологии для сайта «Авангард Строй».

## Категории

| Категория | Default | Примеры |
|-----------|---------|---------|
| `necessary` | всегда `true` | `avgst_cookie_consent`, SmartCaptcha (lazy), CDN/WAF |
| `functional` | `false` | регион, избранное, Kinescope, VK Video |
| `analytics` | `false` | Яндекс.Метрика, Roistat, analytics.avgst.ru, A/B / adaptive testing |
| `marketing` | `false` | Яндекс.Директ / Аудитории, VK Ads |

Прокрутка и «продолжение использования» **не** считаются согласием.

## Архитектура

```
src/consent/
  ConsentProvider.tsx      # state + API
  ConsentShell.tsx         # provider + banner + settings (в layout)
  CookieBanner.tsx
  CookieSettingsDialog.tsx
  ConsentGate.tsx
  EmbedPlaceholder.tsx
  storage.ts               # first-party cookie
  cleanup.ts               # revoke cleanup registry
  registry.ts              # integration registry
  integrations/register.ts
  analytics.ts             # typed events + PII guard
  functional-persist.ts
  server.ts                # SSR cookie read helper
  types.ts
```

Cookie: `avgst_cookie_consent`, version `2026-09-16.2`, Max-Age 12 месяцев, SameSite=Lax, Secure в production.

Audit: `POST /api/consent` → JSONL `data/cookie-consent-events.jsonl` (пока без БД).

Повторное изменение выбора: кнопка **«Настройки cookie»** на странице `/cookies` (не в футере).

## Роутинг документов (политики и правила)

Канон — короткие пути в корне:

| Документ | URL |
|---|---|
| Политика cookie | `/cookies` |
| Политика ПДн | `/privacy` |
| Правила реферальной программы | `/referral` |

Старые `/legal/*` и `/personal-data` отдают постоянный редирект на канон.

## ConsentManager API

```ts
const {
  state,
  decided,
  hasConsent,
  acceptAll,
  acceptNecessaryOnly,
  saveCustom,
  openConsentSettings,
} = useConsent()
```

## Как добавить сервис

1. Зарегистрировать в `integrations/register.ts` с категорией.
2. Реализовать `init` / `revoke` — **не** вставлять `<Script>` в layout.
3. Добавить cleanup keys в `cleanup.ts`.
4. UI-компонент грузить ресурс только через `hasConsent(category)` или `ConsentGate`.
5. Для embeds — `EmbedPlaceholder`.

## Смена версии consent

При существенном изменении категорий/целей поднять `CONSENT_VERSION` в `types.ts`. Старое согласие станет недействительным, banner покажется снова.

## Тестирование

```bash
npx playwright test e2e/cookie-consent.spec.ts
```

Сценарии: fresh user (нет third-party network), necessary only, analytics/functional/marketing, revoke.

## Integrations в проекте

| ID | Категория | Статус |
|----|-----------|--------|
| yandex-maps | necessary | реализовано (OfficeMap, офис/производство) |
| kinescope | functional | реализовано (FactoryVideo / lightbox) |
| vk-video | functional | реализовано (lightbox) |
| yandex-metrica | analytics | adapter: грузится при `NEXT_PUBLIC_YM_ID` + consent |
| roistat | analytics | placeholder (`NEXT_PUBLIC_ROISTAT_ID`) |
| avgst-analytics | analytics | placeholder API |
| yandex-ads | marketing | placeholder — **MANUAL ACCOUNT CONFIGURATION REQUIRED** |
| vk-ads | marketing | placeholder (нет pixel ID) |
| smartcaptcha | necessary | ещё не подключена в UI форм |

## ENV

```
NEXT_PUBLIC_YM_ID=
NEXT_PUBLIC_ROISTAT_ID=
NEXT_PUBLIC_YANDEX_ADS_ID=
NEXT_PUBLIC_VK_PIXEL_ID=
# SmartCaptcha — позже
# YANDEX_SMARTCAPTCHA_SITE_KEY=
# YANDEX_SMARTCAPTCHA_SERVER_KEY=
```

## Manual account checklist

### Яндекс.Метрика
- WebVisor on; masking / form recording; **не** `ym-record-keys` на ПДн-формах
- Рекламные аудитории: если нельзя отделить от аналитики — считать marketing
- Срок хранения, counter ID

### Roistat
- project code, calltracking numbers, attribution period, CRM visit ID only (без PII в Roistat)

### VK
- pixel/tag, conversions, retargeting audiences

### SmartCaptcha
- site/server keys, allowed domains

### Яндекс.Директ / Аудитории
- **MANUAL ACCOUNT CONFIGURATION REQUIRED**: разделение Метрики и рекламных аудиторий на стороне кабинета

## CSP origins (черновик, не включать жёстко без проверки)

- `mc.yandex.ru`, `yandex.ru`, `api-maps.yandex.ru`, `*.maps.yandex.net`
- `kinescope.io`
- `vk.com`, `*.vk.com`
- Roistat / ads — по фактическим ID

Google Analytics / Ads / Meta Pixel **не** подключать без LEGAL REVIEW REQUIRED.
