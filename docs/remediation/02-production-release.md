# Выпуск исправлений производительности

28 октября 2026 года. Пользователь явно разрешил production deployment при отсутствии препятствий.

## Состав

Коммит `6d6845cbf067bca568a3ea0968c1d4dbfa674858`: обработка отказов CMS, readiness, идентификатор сборки и запросов, параллельные SSR-чтения, клиентские переходы карточек, проверки и документация. После проверок уточнены тесты SDK outcomes и исправлена повторная обработка локальных картинок. Выпущенный коммит — `0161521f8bf5b94d09bf510833b4c2482fe42173`. Код формы не менялся. Исходная база — `c544500b9a80946deb53829e5942053c1d78f5bc`.

Локальные пользовательские изменения `cms/src/data/site-index.json`, `cms/src/payload-types.ts`, диагностические и презентационные файлы и новые изображения в коммит не включены. Зависимости и lockfiles не изменены. CMS и миграции базы данных в этот выпуск не входят.

## Проверки перед выпуском

- Локально: production build, TypeScript и lint прошли; 9 unit-тестов и 16 групп runtime-проверок прошли. Подробности в `01-first-stages.md`.
- Первая проверка Linux: [Browser release quality gate](https://github.com/nikita-yakuschenko/site/actions/runs/40653971271). CMS, сборки, unit и resilience прошли, браузерные сценарии — 93/95. Два WebKit mobile случая не увидели alert; в trace не было запроса captcha-config после click, телефон оставался последним заполненным полем, а consent уже отмечен по умолчанию. Для устранения зависимости от обработки первого клика при фокусе мобильного поля helper вызывает blur; реальные click и проверки безопасности сохранены. Артефакты первого прогона локально: `output/deploy-ci-first/`.
- Вторая проверка `315b649`: [Browser release quality gate](https://github.com/nikita-yakuschenko/site/actions/runs/40655203871). 94/95 браузерных сценария прошли; прежние два случая прошли, но javascript-error в WebKit mobile не увидел alert. В сетевой трассе снова отсутствовали запросы smartcaptcha-config, captcha.js и next/leads после synthetic click. Blur оказался недостаточным. Артефакты: `output/deploy-ci-second/`.
- Для четырёх SDK error modes и отсутствующего sitekey применяется стандартный `HTMLFormElement.requestSubmit()`, как в уже существующем timeout test. Проверяются прежние alert, отсутствие отправки, cleanup и успешный явный retry. Реальные click остаются в сценариях отсутствия загрузки SDK до валидации, SDK download failure, отказа receipt, pending navigation, диалогов и других сценариях. Утверждение о полном исправлении mobile tap в продукте не делается.
- Третья проверка точного выпуска `9c81183`: [Browser release quality gate](https://github.com/nikita-yakuschenko/site/actions/runs/40656166426).
- В третьем прогоне 95/95 браузерных регрессий прошли; CMS — 155/155 тестов и сборка. Release gate дал 15/25: обнаружил runtime optimization изображений. Локальное воспроизведение подтвердило реальные локальные источники (`/series/*`, `/persons/*`, `/catalog/norvegiya-115/*`, `/media/referral/*`), поэтому gate не обходился: исправлены соответствующие компоненты.
- `3e39264` уточняет различие штатного bounded CMS optimizer и запрещённого local optimizer, добавляя три теста политики (9/9 diagnostic unit в сумме); попытка CI `40657357258` отменена после обнаружения необходимости исправить локальные компоненты.
- `6a0188f` возвращает выдачу подготовленных WebP в PhotoTile, BlockRenderer, HistoryPhotoCarousel, PhotoLightbox и ReferralProgram. Геометрия сохранена. Локальная сборка и TypeScript проходят; подробный сетевой контроль локального production build сохранён в `artifacts/local-image-release.log`.
- Прогон `6a0188f`: [Browser release quality gate](https://github.com/nikita-yakuschenko/site/actions/runs/40658007820). Браузерные регрессии 95/95; release gate 21/25. Расширение локальной проверки до других технологий и прокрутки к комплектации выявило ещё `/media/project-next-steps/*` и fallback-планировки `/catalog/duplex-173/*`.
- `0161521` также переводит локальные картинки ProjectNextSteps и fallback ProjectPlans на готовые WebP без оптимизатора. CMS-фотографии visit/планировок сохраняют штатную responsive-обработку. Локальный production build и точные критические сценарии каталога/регионов/форм/главной в Chromium desktop/mobile прошли: **10/10**, 38,6 с; лог `artifacts/release-local-critical.log`.
- Итоговый полный прогон: [Browser release quality gate](https://github.com/nikita-yakuschenko/site/actions/runs/40659480011).
- Предварительный production smoke: главная, `/privacy`, `/catalog`, `/catalog/barhhouse-73` и `/api/health` отвечали 200. Артефакт: `artifacts/deploy-before.json`.

Приложение Dokploy: `ZtzJoz1z-rCdGZjJ9Iqg6`, «Сайт [Авангард Строй 4.0]». Источник — `main`; autoDeploy отключён. Обновление настроено как start-first с rollback при отказе. Runtime environment, секреты, ресурсы, домены и healthcheck не меняются.

Push-triggered workflow CMS не запускается благодаря `[skip ci]` в сообщении коммита; браузерный gate запускается отдельно через workflow_dispatch. Это позволяет проверить код без ненужного выпуска CMS и запуска миграций.

## Состояние

Полный CI `40659480011` завершился успешно. Проверенный коммит `0161521f8bf5b94d09bf510833b4c2482fe42173` перенесён fast-forward в `main` и опубликован; локальная `main` и `origin/main` совпадают. Конфликтов с посторонними пользовательскими изменениями нет.

В Dokploy 28.10.2026 в 08:59:07 UTC запущен deployment `4rzIBhMThVEVSqWsw2QKZ`, «Performance and CMS resilience: main 0161521», из `main`. Завершён успешно в 09:06:54 UTC (12:06:54 Europe/Moscow), статус `done`, errorMessage отсутствует.

Финальный CI: CMS **155/155**, diagnostic unit **9/9**, server unit **9/9**, WebP preparation **1/1**, браузерные регрессии **95/95**, release gate **25/25**. Последние два набора выполнены в пяти профилях без retry. Локальные критические Chromium desktop/mobile — **10/10**.

## Проверка production после переключения

Smoke начат в 09:07:16 UTC. [Сырые результаты](artifacts/deploy-after.json).

- `/api/health`, `/api/ready`, `/api/catalog/availability`, `/`, `/privacy`, `/catalog`, `/catalog/barhhouse-73` — **200**. Readiness — `ready`; ошибки загрузки страниц не отображаются.
- Несуществующий `/catalog/production-smoke-missing-4b96521` — **404**.
- Build ID health и readiness совпал: `3a313bb0640605afd4a153f8663be613e45c507b041b9b515507ce125f601d6c`.
- Chromium desktop/mobile: переход из реального каталога в `/catalog/barnhouse-71` сохраняет `performance.timeOrigin`; Back работает; необработанных browser exceptions нет. Скриншоты сохранены локально в `artifacts/production-desktop.png` и `artifacts/production-mobile.png`.
- Записывающие и сторонние browser-запросы при smoke блокировались; формы не отправлялись, тестовые заявки не создавались.

`durationMs` в smoke JSON включает чтение тела ответа и не является отдельным TTFB benchmark. Production CWV/ускорение по этому smoke не объявляются измеренными. Локальные контролируемые SSR-измерения остаются в `01-first-stages.md`.

Revision-параметр health по-прежнему `unknown`: Docker-сборка не получила APP_COMMIT, а Git исключён из контекста. Новый build ID доступен; исходный revision подтверждается опубликованной `main` и deployment из неё. Production env/buildArgs не перезаписывались, поскольку коннектор возвращает их скрытыми и сохранить неизвестные значения без потерь невозможно. Настройка автоматической передачи revision остаётся отдельным пунктом, не объявляется выполненной.

Этот отчёт и публичные smoke-артефакты сохраняются отдельным коммитом документации после выкладки. Он не меняет runtime-код выпущенного `0161521` и не требует нового deployment.
