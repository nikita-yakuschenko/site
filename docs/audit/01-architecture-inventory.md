# Инвентаризация архитектуры

Аудит 28 октября 2026 года (Europe/Moscow). Снимок репозитория HEAD c544500b9a80946deb53829e5942053c1d78f5bc; незакоммиченные изменения перечислены в [git-status-before.txt](artifacts/git-status-before.txt). Аудит диагностический: исходники, зависимости, lockfiles, CMS, production-настройки и workflows не исправлялись.

Статусы: **CONFIRMED** — воспроизводимое измерение/наблюдение; **CODE-EVIDENCED** — механизм виден в коде, runtime-ущерб не измерен; **HYPOTHESIS** — требует проверки; **NOT VERIFIED** — не проверено; **PASSED** — выполненная проверка с ограниченным указанным охватом. PASSED не означает доказанного отсутствия любых проблем.

## Стек и сборка

Frontend: Next.js16.4.3, React/ReactDOM19.2.6, TypeScript5.7.3; App Router, production Turbopack, standalone output. Node hostv22.13.1, Playwright1.63.0, sharp0.35.5. Обнаружено234 TS/JS-модуля src/,99 файлов с use client; размер/строки не являются измерением runtime стоимости. [modules.json](artifacts/modules.json), [largest-modules.json](artifacts/largest-modules.json).

CMS — отдельное Next/Payload3.92.0 приложение, PostgreSQL через @payloadcms/db-postgres (Drizzle под адаптером), Lexical, React, sharp, Nodemailer, ExcelJS, Recharts, UI Radix/Base UI. Это зависимости CMS, их нельзя автоматически приписывать клиенту публичного сайта. CMS engines ^22.23.4 || >=24.22.1; host22.13.1 ниже требования. Frontend engines ≥22 выполняется.

Основные каталоги: src/app — routes/layout/proxy; src/components — UI/сценарии; src/lib/catalog — provider/фильтры/конфигурации; src/lib/cms — content binding; src/consent — состояние согласия; src/server — CAPTCHA; src/data — реестры; public — статические медиа; cms/src/collections — CMS contracts и endpoints; cms/src/automation — CRM/mail jobs; diagnostics/e2e — браузерные проверки; .github/workflows — сборки и quality audit.

## Потоки и состояние

Браузер → Traefik → frontend proxy (редиректы, регион, attribution) → RootLayout (cookies/headers, CMS integrations/content/catalog) → page Server Components → HTML/RSC → Client Components.

Frontend → CMS REST → Payload → PostgreSQL/media. Заявка: client validation → динамический SmartCaptcha → POST /next/leads → rate limit → server CAPTCHA verify → CMS lead-submissions → действующая CRM/automation. Последний путь в аудите не исполнялся.

Состояние: локальные React state/transitions/optimistic state, Context для CMS/региона/согласия/телефона/availability, useSyncExternalStore для favorites/tiers/office. Redux/Zustand не обнаружены. Наличие Client Provider над children само по себе не переводит переданные Server Components в client bundle; границы проверялись по build graph.

Global SiteChrome — Client Component с меню/региональным телефоном/dialog. CMSStaticBlock связывает контент на сервере и включает интерактивный редактор только при editor header. CMSContentProvider передаёт records клиенту; map создаёт новый value при его render. Частота лишних rerenders и польза memoization не измерены; blanket useMemo/useCallback не предлагаются.

Дополнительная общая зависимость: src/app/not-found.tsx:18–19 получает popular projects для error boundary. В mock обычная200-страница /privacy также запрашивала /api/blocks/content?key=popularProjects; единственный соответствующий вызывающий компонент этого пути — глобальная NotFound boundary. Это учтено как часть общего server graph F03: облегчение одного availability fetch само по себе не гарантирует исчезновение полного catalog из fallback. Влияние отдельной boundary на initial TTFB не изолировано A/B.

## Матрица frontend маршрутов

Все35 записей build, включая _not-found, помечены ƒ. Ни одна публичная страница не подтверждена как SSG/ISR whole-route. Причина — request-time cookies/headers в root и connection в providers; отдельные fetch имеют Data Cache. Redirect aliases обычно обрабатываются до рендера и не следует считать их полным SSR-сценарием. 25 page.tsx и9 route.ts; динамические slug разворачиваются по данным, это не34 конечных URL.

Для **каждой HTML page**, кроме раннего redirect: есть общие Server Layout/Page и Client Shell/Providers, гидратация общих интерактивных компонентов, общие CMS settings/content/catalog dependencies; весь HTML private/no-store. Таблица ниже добавляет зависимости самой страницы. Медиа и client dependencies прослеживаются через imports в машинной матрице.

| Маршрут | Тип | Источник | Собственные зависимости |
| --- | --- | --- | --- |
| /about | Content/marketing | src/app/about/page.tsx | см. imports в routes-source.json |
| /api/catalog/availability | API | src/app/api/catalog/availability/route.ts | см. imports в routes-source.json |
| /api/consent | API | src/app/api/consent/route.ts | см. imports в routes-source.json |
| /api/health | API | src/app/api/health/route.ts | см. imports в routes-source.json |
| /api/maps-key | API | src/app/api/maps-key/route.ts | см. imports в routes-source.json |
| /api/reactions | API | src/app/api/reactions/route.ts | см. imports в routes-source.json |
| /api/smartcaptcha-config | API | src/app/api/smartcaptcha-config/route.ts | см. imports в routes-source.json |
| /api/views | API | src/app/api/views/route.ts | см. imports в routes-source.json |
| /api/yandex-rating | API | src/app/api/yandex-rating/route.ts | см. imports в routes-source.json |
| /basic-mortgage | Mortgage | src/app/basic-mortgage/page.tsx | mortgage content/catalog |
| /business | Content/marketing | src/app/business/page.tsx | см. imports в routes-source.json |
| /catalog | Catalog | src/app/catalog/page.tsx | catalog |
| /catalog/[slug] | Catalog | src/app/catalog/[slug]/page.tsx | hero/catalog, reactions, exteriors/interiors/built/plans/configurations/next-steps/order |
| /cms-preview/configurations | Preview | src/app/cms-preview/configurations/page.tsx | см. imports в routes-source.json |
| /cookies | Content/marketing | src/app/cookies/page.tsx | см. imports в routes-source.json |
| /dealers | Content/marketing | src/app/dealers/page.tsx | см. imports в routes-source.json |
| /exposition | Exposition | src/app/exposition/page.tsx | local exposition data |
| /exposition/[slug] | Exposition | src/app/exposition/[slug]/page.tsx | local exposition data |
| /factory-open-day | Content/marketing | src/app/factory-open-day/page.tsx | event, hero copy |
| /family-mortgage | Mortgage | src/app/family-mortgage/page.tsx | mortgage content/catalog |
| /for-sale | Catalog | src/app/for-sale/page.tsx | catalog |
| /it-mortgage | Mortgage | src/app/it-mortgage/page.tsx | mortgage content/catalog |
| /legal/cookies | Redirect | src/app/legal/cookies/page.tsx | см. imports в routes-source.json |
| /legal/privacy | Redirect | src/app/legal/privacy/page.tsx | см. imports в routes-source.json |
| /legal/referral | Redirect | src/app/legal/referral/page.tsx | см. imports в routes-source.json |
| /manufacture | Content/marketing | src/app/manufacture/page.tsx | см. imports в routes-source.json |
| /mortgage | Mortgage | src/app/mortgage/page.tsx | mortgage content/catalog |
| /next/leads | API | src/app/next/leads/route.ts | см. imports в routes-source.json |
| / | Content/marketing | src/app/page.tsx | hero/popular/series, catalog, stories, hero preview |
| /personal-data | Redirect | src/app/personal-data/page.tsx | см. imports в routes-source.json |
| /preview/project | Preview | src/app/preview/project/page.tsx | см. imports в routes-source.json |
| /privacy | Content/marketing | src/app/privacy/page.tsx | см. imports в routes-source.json |
| /referral | Content/marketing | src/app/referral/page.tsx | см. imports в routes-source.json |
| /stories | Content/marketing | src/app/stories/page.tsx | stories feed |

[routes-source.json](artifacts/routes-source.json) содержит imports каждого маршрута; [bundle-route-groups.json](artifacts/bundle-route-groups.json) — точные client/bootstrap/render-dependent/async groups для каждого маршрута, включая media outputs. [app-path-routes-manifest.json](artifacts/app-path-routes-manifest.json) и [build.log](artifacts/build.log) подтверждают build routes.

API: /api/health — только process liveness; /api/catalog/availability — boolean из provider; /api/consent — запись согласия; /api/views и /api/reactions — счётчики CMS; /api/maps-key и /api/smartcaptcha-config — публичная runtime-конфигурация; /api/yandex-rating — cached read external widget; /next/leads — отправка заявки. GET не подразумевается для write endpoints. CMS имеет REST /api/[...slug], custom /api/projects/*, /api/blocks/content, /api/stories/feed, /api/pages/redirects, automation и /api/ready. Полная безопасность admin/automation API вне performance scope.

## Карта кеширования

| Слой | Механизм | Свежесть/ограничение |
| --- | --- | --- |
| Browser static | /_next/static immutable; generated/webp immutable1year | Фактические заголовки и repeat-visits.json; manifest/hash URLs |
| Обычный public | Default Next public caching + rewrites | Не все public файлы имеют immutable; проверять конкретный URL |
| CMS media | Cache-Control public max-age2592000; thumbnails | CMS next.config; актуальность same URL при замене файла отдельно не испытана |
| Next image | Responsive widths/qualities, optimizer cache | CMS remotePatterns строго перечислены; image cache HIT ratio не получен |
| HTML / Full Route Cache | Все routes dynamic; private,no-cache,no-store | Нет whole-route SSG/ISR на исследованной сборке |
| Data Cache | catalog/hero/popular/series/stories/integrations revalidate60 | SWR подтверждён моделью; 60 с не строгая верхняя граница stale |
| React.cache | readCMSContent, readCatalog, resolveProjectHero, galleries | Дедупликация внутри render/request; не persistent кэш между запросами |
| Uncached CMS | blocks all by route, configurations/plans/order/reactions/... | no-store, timeout3–8 с, обычно fallback без upstream telemetry |
| Hero previews | unstable_cache, revalidate86400 | Крошечный server-generated preview; холодный source fetch+sharp до HTML возможен |
| Proxy registry | module cache30s; pending single-flight; error retry5s | Сохраняет прошлые rules при отказе; процесс/реплика имеет собственную копию |
| CMS media allowlist | Promise-кэш10s и invalidation hooks | Есть single-flight в процессе; не распределённый cache |
| Router Cache/prefetch | Next client navigation defaults, Links | Наблюдались RSC prefetch; stripped URLs не считать доказательством дублей |
| CDN/reverse proxy | Traefik HTTPS routing; выбранные response headers | Cache hit ratio/CDN policy и региональная топология NOT VERIFIED |
| DB cache | Не установлено | Shared buffers/pg_stat_statements/реальные планы недоступны |


## Медиа, шрифты и сторонние сервисы

public inventory:1254 файла,914159121 байт до generation; это объём на диске, не transfer одной страницы. Prebuild кодирует760 файлов:569,0 MB→277,5 MB в изолированной копии. Отдельно183 кадров82,05 MB не включены в текущую manufacture page. [public-assets.json](artifacts/public-assets.json), [image-encoding-experiments.json](artifacts/image-encoding-experiments.json).

Шрифты: GeistSans next/font в root, локальные Inter Variable TTF876576 B и Unbounded TTF778272 B у factory-open-day (display swap, preload false). WOFF2 UntitledSans43954 B лежит в public; наличие файла не доказывает его загрузку. Фактические font requests — browser-runs и дополнительная factory серия.

Интеграции: One2Click async script в head; Roistat inline bootstrap перед гидратацией + call tracking; Яндекс.Метрика webvisor/clickmap после эффекта; VK/Mail.ru pixel; Яндекс.Карты по взаимодействию; SmartCaptcha через next/dynamic после валидного submit; Kinescope/VK video lightboxes после клика. Бизнес-политика явно включает аналитические интеграции сразу, независимо от consent prompt. Отсрочка без согласования этого требования не предлагается. Их live CPU/init/INP overhead в controlled сериях **не измерен**.

## Инфраструктура и границы доступа

Frontend Docker: multistage node22.17.0-alpine, standalone, non-root, packaged public и health30s. CMS: multistage node22-bookworm-slim, standalone+миграционный runtime, persistent media dir, worker внутри web process. CMS init может выполнять seed/worker: для аудита CMS production server локально не запускался и БД не подключалась.

Dokploy read-only подтвердил deployed settings (F14), start-first/rollback у frontend и healthchecks. CMS /api/ready отвечает200 с revision текущего HEAD; frontend commit unknown. Это не доказательство runtime CPU/RAM/OOM или корректности многорепличной CMS. [deployment-sanitized.json](artifacts/deployment-sanitized.json), [deployed-revisions.json](artifacts/deployed-revisions.json).
