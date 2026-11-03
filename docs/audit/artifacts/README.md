# Доказательства аудита 2026-10-28

Основные выводы находятся в восьми документах на уровень выше. Этот каталог содержит исходные измерения, диагностические scripts и повторяемые команды; приложения не исправлялись.

## С чего начать

- `audit-counts.json`, `checks.json`, `findings.json` — машиночитаемый реестр и единицы учёта.
- `audit-quality-check.json`, `source-integrity.json`, `git-status-before.txt`, `git-status-after.txt` — самопроверка и неизменность приложения.
- `environment.json`, `*-browser-profile.json`, `deployed-revisions.json`, `isolation-diff.json` — версии, профиль и происхождение данных.
- `baseline-summary.json`, `http-summary.json`, `repeat-summary.json`, `coverage-summary.json` — сводки; значения каждого повтора сохранены отдельно.

## Сырые измерения

- `production-validated-browser-runs.json` — основной controlled production baseline (20 navigations). Trackers/mutations blocked; публичные media origins разрешены.
- `production-browser-runs.json` — ранняя exploratory серия (20), с более узким allowlist и коротким окном; не использовать вместо validated baseline.
- `local-browser-runs.json` — 60 navigations, production standalone, штатный fixture catalog; не production CMS latency.
- `local-open-day-browser-runs.json` — 10 дополнительных navigations для font/landing сценария.
- `production-http.json` — 25 обычных последовательных curl GET, без нагрузки/concurrency на production.
- `server-experiments.json` — 30 локальных запросов с добавленной upstream задержкой0/250мс. В первоначальном raw capture concurrent request end timestamps ненадёжны; route TTFB/total/start order надёжны. Script исправлен для будущего повтора, прежние данные не переписаны.
- `cache-failure-experiment.json` — только локальная mock CMS:503→empty200/false404 и A→B stale/revalidation.
- `repeat-visits.json` — 20 reload с сохранённым browser cache. CDP disk flags не включают все memory hits; проверять также ResourceTiming.transferSize.
- `interactions.json` — 90 проверок. Legacy ID client-transition-catalog-to-project оказался hard document navigation: см.sameDocument:false и F17.
- `client-link-navigation.json` — 10 настоящих Next Link переходов, sameDocument:true.
- `filter-repeats.json` — 10 technology-filter/check/reset сценариев.
- `modal-memory-trend.json` — 60 modal cycles с GC checkpoints; не длительный leak/soak тест.
- `coverage.json`, `trace-*.json`, `*.heapsnapshot`, `*-waterfall-*.json`, `*.png` — дополнительные доказательства. HAR с raw cookies/headers не создавался.

## Build и код

`build.log`, `verification-results.json`, `cms-unit-tests-rerun.log`, `cms-typecheck.log`, `diagnostic-unit-tests.log`, `lint.log`, `unused-symbols.log` фиксируют выполненные команды. Пустой unused-symbols.log соответствует exit0 в verification-results.json.

`bundle-graph.jsonl` — штатный Next analyzer export; `bundle-attribution.json` — агрегация уникальных emitted client parts всей сборки. Это не JS одного визита; compressed parts не складываются в HTTP gzip. `bundle-files.json` — фактические файлы; `server-bundle-summary.json` исключает external dependencies/public/cache.

`modules.json`, `routes-source.json`, `largest-modules.json`, `local-import-cycles.json`, `public-assets.json`, `largest-images.json`, `duplicate-packages.json`, `npm-outdated.json` — статический снимок. Три синтаксических цикла замыкаются import type и не объявлены runtime cycles. Большой оригинал на диске не равен переданному браузеру ресурсу.

`image-encoding-experiments.json` содержит только измеренную потенциальную экономию байтов; визуальное качество кандидатов NOT VERIFIED. Изображения приложения не менялись.

`deployment-sanitized.json` содержит только выбранные не секретные настройки Dokploy. Runtime monitoring вернул пустые ряды; нельзя выводить отсутствие OOM/перегрузки из этих настроек.

## Неудачные попытки harness

`interactions-harness-attempt*.json/log` и первый `cms-unit-tests.log` сохранены для прозрачности. Причины — диагностическое копирование/селекторы/ожидание закрытия UI; окончательные подтверждения находятся в перечисленных final outputs. Они не считаются дефектами приложения.

Scripts с абсолютными путями рассчитаны на текущую машину и изолированную копию `D:/site-audit-20261028`. Порядок команд и ограничения — в `../02-performance-baseline.md`. Ничего из этого каталога не предназначено для импорта приложением или production deploy.
