# Покрытие и ограничения

Аудит 28 октября 2026 года (Europe/Moscow). Снимок репозитория HEAD c544500b9a80946deb53829e5942053c1d78f5bc; незакоммиченные изменения перечислены в [git-status-before.txt](artifacts/git-status-before.txt). Аудит диагностический: исходники, зависимости, lockfiles, CMS, production-настройки и workflows не исправлялись.

Статусы: **CONFIRMED** — воспроизводимое измерение/наблюдение; **CODE-EVIDENCED** — механизм виден в коде, runtime-ущерб не измерен; **HYPOTHESIS** — требует проверки; **NOT VERIFIED** — не проверено; **PASSED** — выполненная проверка с ограниченным указанным охватом. PASSED не означает доказанного отсутствия любых проблем.

## Учёт

82 групп проверок; выполнено 64, не выполнено 18. Это группы технических проверок, не количество URL и не число assertions. Внутри есть90 основных cold-browser navigations (70 local+20 production controlled), дополнительные exploratory20, HTTP25, causal mock30, failure/cache и interaction/repeat серии; точные n каждой серии в JSON. Число navigations не приравнивается к production traffic sample.

| Статус | Количество |
| --- | --- |
| PASSED | 42 |
| CONFIRMED | 12 |
| CODE-EVIDENCED | 10 |
| HYPOTHESIS | 0 |
| NOT VERIFIED | 18 |


## Полная матрица

| № | Проверка | Статус | Доказательство или причина/условия |
| --- | --- | --- | --- |
| 1 | Стек, версии и профиль машины | PASSED | environment.json |
| 2 | Все frontend page/route endpoints | PASSED | routes-source.json; app-path-routes-manifest.json |
| 3 | Режимы рендеринга production build | PASSED | build.log: все 35 записей ƒ |
| 4 | Server/Client Component граф | PASSED | modules.json; bundle-graph.jsonl |
| 5 | Циклические локальные импорты | PASSED | Три кандидата в local-import-cycles.json замыкаются только import type; runtime цикл не подтверждён |
| 6 | Dead code и неиспользуемые assets | CODE-EVIDENCED | F15; отсутствие module scene в build graph |
| 7 | Размеры крупных компонентов и связи | PASSED | largest-modules.json; без вывода о скорости по строкам |
| 8 | Устаревшие зависимости | PASSED | npm-outdated.json; только snapshot registry, обновления не выполнены |
| 9 | Дубли версий пакетов | PASSED | duplicate-packages.json; преимущественно tooling, не равны дублированию клиентского runtime |
| 10 | Клиентские размеры и package attribution | PASSED | bundle-files.json; bundle-attribution.json; bundle-graph.jsonl |
| 11 | Размер серверных output | PASSED | bundle-graph.jsonl; server-bundle-summary.json |
| 12 | Tree shaking общих данных | CONFIRMED | F07; client manifest part 72 151 B |
| 13 | Code splitting SmartCaptcha | PASSED | bundle-route-groups.json; dynamic ssr:false, async group |
| 14 | Server-only boundary | PASSED | build.log; server-only модули не импортируются как обычный client runtime |
| 15 | Известные локальные секреты в fixture client JS | PASSED | client-known-secret-scan.json; 6 значений, 47 JS, 0 совпадений; ограниченная проверка |
| 16 | Frontend production build и TypeScript | PASSED | build.log |
| 17 | Неиспользуемые imports/locals/parameters | PASSED | unused-symbols.log и verification-results.json; tsc --noUnusedLocals --noUnusedParameters --incremental false exit0; не проверяет недостижимые exported modules |
| 18 | Frontend lint | CONFIRMED | F12; 3 errors, 29 warnings |
| 19 | CMS unit tests в изолированной копии | PASSED | cms-unit-tests-rerun.log; 155/155 |
| 20 | CMS TypeScript без запуска приложения/БД | PASSED | cms-typecheck.log; npm run typecheck exit0; supported runtime build при этом не аттестован |
| 21 | Unit tests диагностического классификатора | PASSED | diagnostic-unit-tests.log; 6/6 |
| 22 | Полная production-сборка CMS | NOT VERIFIED | Node 22.13.1 ниже engines CMS ^22.23.4 \|\| >=24.22.1; isolated CMS build нужен на поддерживаемом Node без production DB |
| 23 | Задержка общего layout | CONFIRMED | F03; server-experiments.json, 5 повторов каждого условия |
| 24 | Waterfall карточки | CONFIRMED | F04; server-experiments.json |
| 25 | Свои API из Server Components | PASSED | CMS — отдельный сервис, не ошибочно объявлен HTTP-вызовом собственного frontend API |
| 26 | Metadata и повторная загрузка hero | CODE-EVIDENCED | resolveProjectHero = React.cache; повторный get одного slug не объявлен дублем |
| 27 | Proxy registry cache и single-flight | CODE-EVIDENCED | managed-redirects.ts: TTL30s, pending promise, stale rules при ошибке; модель подтверждает cold lookup |
| 28 | Hydration ошибок в controlled Chromium | PASSED | browser-runs; trackers blocked; не распространяется на live SDK |
| 29 | Hydration с действующими сторонними SDK | NOT VERIFIED | Нужен отдельный согласованный прогон с провайдерами и фильтрацией их побочных запросов |
| 30 | Повторные React renders/commit profiling | NOT VERIFIED | Нужна изолированная profiling build next build --profile и React Profiler; CDP ScriptDuration не заменяет commits |
| 31 | Listeners/timers/observers cleanup | CODE-EVIDENCED | Проверены use-lead-captcha, lightbox, preview, manufacture; cleanup есть, длительный leak не исключён |
| 32 | Холодные browser загрузки desktop/mobile | PASSED | local-browser-runs.json; production-validated-browser-runs.json; минимум 5 |
| 33 | Повторные посещения и browser cache | PASSED | repeat-visits.json; HTTP cache сохранён без Playwright routing |
| 34 | Client route transition и фактический режим card navigation | CONFIRMED | F17: карточка hard navigation10/10; client-link-navigation.json: nav Link sameDocument10/10; elapsed не INP |
| 35 | DNS/TCP/TLS/HTTP TTFB | PASSED | production-http.json; 5 ordinary GET, не load test |
| 36 | Production TTFB budget | CONFIRMED | F01 |
| 37 | Production mobile FCP/LCP budget | CONFIRMED | F02 |
| 38 | Конкретный LCP и его фазы | PASSED | baseline-summary.json; текст/изображение различены |
| 39 | Speed Index | NOT VERIFIED | Нет установленного Lighthouse CLI/speedline; доступный Lighthouse connector исключает performance. Нужен Lighthouse runner с filmstrip |
| 40 | Lighthouse Performance score | NOT VERIFIED | Доступный lighthouse_audit измеряет a11y/SEO/best-practices, performance исключён; установить/использовать отдельно согласованный CI runner |
| 41 | Lighthouse TBT | NOT VERIFIED | Сохранён только observed long-task blocking, без окна Lighthouse TTI; нужен полноценный navigation Lighthouse |
| 42 | Полевые CWV p75/INP | NOT VERIFIED | RUM dataset/CrUX не получены; semantic catalog не даёт CWV. Нужен доступ к телеметрии и достаточная выборка |
| 43 | CLS и конкретные источники | PASSED | Browser observer session-window CLS, sources сохранены; budget ≤0.1 выдержан в измеренных initial states |
| 44 | JS execution и observed long tasks | PASSED | CDP Performance metrics и PerformanceObserver; не TBT/INP |
| 45 | Network waterfall/приоритеты/цепочки | PASSED | *-waterfall-*.json; resource timing в browser-runs |
| 46 | Performance traces | PASSED | trace-home-mobile.json; trace-manufacture-mobile.json |
| 47 | Изображения: форматы, bytes, natural/display/DPR | PASSED | largest-images.json; browser-runs; image-encoding-experiments.json |
| 48 | Responsive local media | CONFIRMED | F06; PageHero unoptimized, optimizedSrc local one variant |
| 49 | Эксперимент вариантов кодирования | PASSED | image-encoding-experiments.json; только память, исходники не изменены |
| 50 | Приемлемость качества кандидатных изображений | NOT VERIFIED | Нужна визуальная приёмка на DPR1/2/3; экономия байтов не подтверждает качество |
| 51 | Видео autoplay/preload/poster/player gating | CODE-EVIDENCED | HeroPromo video autoplay без явного preload; текущий показ зависит от данных. FactoryVideo монтирует lightbox по клику |
| 52 | Шрифты и поддержка кириллицы | PASSED | next/font Geist; factory local fonts; network/metadata. Полная экспертиза glyph coverage за пределами начального текста не выполнена |
| 53 | CSS payload и initial coverage | CONFIRMED | F08; coverage.json, не основание удалять state-specific CSS |
| 54 | DOM size/depth и overflow | PASSED | browser-runs; порог DOM не назначался произвольно |
| 55 | Forced layout/layout thrashing | NOT VERIFIED | Трейсы есть; требуется стековая атрибуция forced synchronous layout по interaction trace, одних Layout events недостаточно |
| 56 | Blur/will-change/animation свойства | CODE-EVIDENCED | styles.css и animation cleanup; тяжёлый GPU cost без профиля не объявлен |
| 57 | Модал формы и client validation | PASSED | interactions.json; без valid submit |
| 58 | Галерея и её закрытие | PASSED | interactions.json; fixture карточка, provider видео не проверен |
| 59 | Быстрые search/filter/favorite взаимодействия | PASSED | interactions.json; filter-repeats.json; выборка состояний, не все комбинации фильтров |
| 60 | Частичная потеря сети | PASSED | interactions.json offline-modal; дальнейшая server navigation без сети отдельно не покрыта |
| 61 | Отправка формы/доставка CRM | NOT VERIFIED | Намеренно не отправлялась; нужен mock CRM/test tenant и явный безопасный контракт |
| 62 | Browser heap после modal cycles | PASSED | interactions.json; heapsnapshot; короткая сессия не доказывает отсутствие утечки |
| 63 | Длительная сессия/detached DOM trends | NOT VERIFIED | Нужен ≥30–60 min soak и сравнимые heap snapshots с retainer analysis |
| 64 | Утечки серверной памяти/event loop under load | NOT VERIFIED | Нужен отдельный стенд и согласованный профиль нагрузки; host metrics сейчас пусты |
| 65 | API p50/p95/p99 production content | NOT VERIFIED | Локальный CMS token 401; health/ready measured n=5 недостаточно для operational p99; нужен read-only tracing |
| 66 | N+1/SQL/serializer статический анализ | CODE-EVIDENCED | F09; N+1 hypothesis, O(P×R) механика подтверждается кодом |
| 67 | Индексы/pool/pagination | CODE-EVIDENCED | Payload pool max10/timeout5s; unique slug/importKey/lookupKey; действительные индексы БД не прочитаны |
| 68 | EXPLAIN/slow SQL/locks | NOT VERIFIED | Нет прямого read-only PG profiling доступа; нужен обезличенный clone и EXPLAIN ANALYZE BUFFERS |
| 69 | Cache-Control/ETag/Vary/compression | PASSED | production-http.json; browser response selected headers |
| 70 | CMS A→B и background revalidation | CONFIRMED | F10; cache-failure-experiment.json |
| 71 | Cold CMS outage/fallback/health | CONFIRMED | F05; пять повторов, только localhost |
| 72 | CDN cache hit ratio/stampede at scale | NOT VERIFIED | Нет CDN logs/cache metrics; local single-flight proxy доказан только кодом, не распределённо |
| 73 | Docker multistage/non-root/health | CODE-EVIDENCED | Dockerfile, cms/Dockerfile; актуальные runtime layers не извлекались |
| 74 | Настройки действующих приложений Dokploy | PASSED | deployment-sanitized.json; read-only |
| 75 | Фактические CPU/RAM/OOM/swap/disk/network VPS | NOT VERIFIED | readAppMonitoring обоих приложений возвращает пустые массивы; нужны cgroup/host metrics |
| 76 | Production health и CMS readiness | PASSED | production-http.json; deployed-revisions.json; обычный GET |
| 77 | HTTP/2, TLS и gzip | PASSED | Chromium response protocol h2; curl TLS+gzip. HTTP/3 не проверен |
| 78 | Observability/CI quality gates | CODE-EVIDENCED | F11; существующий browser gate сохранён, количественных performance budgets в workflows нет |
| 79 | Production revision идентифицируется | CONFIRMED | F13; сайт commit unknown, CMS revision известен |
| 80 | Load/spike/recovery/RPS limit | NOT VERIFIED | Нагрузка на production запрещена; отдельный согласованный stand/load budget отсутствует, план в отчёте |
| 81 | Регрессия ≤10% относительно прежнего baseline | NOT VERIFIED | Ранее сопоставимых performance серий нет; текущие данные первый baseline |
| 82 | Сохранность рабочего дерева | PASSED | source-integrity.json и git-status-before/after; исходники/lockfiles не изменены |


## Принципиальные ограничения

**Реальное приложение и модель.** Локальный frontend полностью собран, но browser data path fixture. Локальный имеющийся CMS key вернул401 на один read-only catalog GET; значение не сохранено. Mock не воспроизводит SQL, actual CMS media cardinality, live tracking или production network. Production HTTP/initial browser измерены отдельно, его commit unknown — строгое соответствие исходникам не доказано.

**Сторонние сервисы.** Они блокировались в controlled browser sessions ради отсутствия внешних mutations/заявок и стабильности; поэтому CPU/INP/hydration live providers остаются NOT VERIFIED. Kinescope/VK/maps functionality и actual CAPTCHA acceptance не аттестованы. Не считать ошибки blocked_by_client дефектом приложения.

**Среда.** Windows shared desktop, не выделенный benchmark host. География неизвестна, CPU throttling не аппаратный телефон. Некоторые production прогоны пересекались с изолированным build/analyze, что ограничивает точность CPU numbers. Реальные HTTP timings curl подтверждают TTFB независимо от browser paint. Mobile resource completion/многие below-fold изображения правосторонне ограничены10-секундным окном.

**Инструментарий.** Performance Lighthouse CLI, Speed Index processor и React Profiler не установлены. Доступный Chrome tool lighthouse_audit исключает performance, поэтому не запускался ради посторонних баллов. Новые зависимости/lockfile не устанавливались. CDP traces/Network/PerformanceObserver/coverage — штатная безопасная альтернатива части проверок, не эквивалент отсутствующим метрикам.

**БД и VPS.** Нет прямого read-only PostgreSQL profiling соединения или обезличенного клона. Dokploy settings доступны, runtime timeseries обоих приложений пусты. Нельзя вывести отсутствие OOM или высокую доступность из health200/статуса done. Не выполнялись docker exec, миграции, CMS seed/init, DB/production writes.

**Нагрузка.** Обычные browser посещения и25 последовательных HTTP GET не являются stress/load test. Нет отдельного согласованного изолированного нагрузочного профиля; RPS knee, spike, saturation/recovery, long-session server leaks требуют продолжения.

## Как закрыть непроверенное

- RUM: доступ к read-only агрегатам route/device/release с p75 LCP/INP/CLS и объёмом выборки; минимум достаточный traffic window, исключение synthetic.
- Lighthouse: выделенный CI runner с уже разрешённым Lighthouse, фиксированные Chrome/version/network/CPU, JSON+HTML, минимум5 navigation runs по representative routes, Speed Index/TBT и filmstrip.
- React: отдельная изолированная production profiling build (next build --profile); React Profiler для catalog filtering/calculator/dialog/gallery. Не измерять обычный dev build как production.
- SQL: обезличенная изолированная БД, права на read-only EXPLAIN/pg_stat_statements, realistic catalog/blocks/prices sizes; transactions read-only, без migrations.
- Инфраструктура: read-only cgroup limits, CPU/RSS/event-loop/GC/IO/OOM/restart+proxy metrics, time-correlated upstream traces; доступ к CDN hit/miss если CDN есть.
- Формы: mock CRM/mail/CAPTCHA и отдельная тестовая CMS без возможности доставки в действующие аккаунты; затем проверить retries/idempotency/validation/error UX.
- Soak/load: явно согласованные максимумы RPS/concurrency/duration и условия аварийной остановки; только isolated stand. Память: несколько snapshots после forced GC, retainer/detached analysis, навигации/модалы/галереи ≥30–60min.

## Самопроверка и исправленные ошибки диагностического harness

Первый CMS unit run дал один module-not-found из-за пропущенного при копировании src/lib/cms (ошибка /XD cms); каталог восстановлен в isolated copy, повтор155/155. Исходники CMS не исправлялись. Первые interaction harness attempts использовали explicit [role=dialog] вместо implicit dialog и пытались очистить автоматически закрытый mobile search; сценарий исправлен, артефакты attempts сохранены отдельно. Эти ошибки не входят в реестр дефектов продукта.

В mock server timing end timestamps первоначально привязывались к последней записи конкурентной очереди; это ограничивает end-duration attribution, но не измеренные response TTFB/total/start order. Устойчивые conclusions опираются на route totals и причинную задержку. Результаты повторных прогонов и raw logs не скрыты.

В baseline не подменены INP/TBT/RUM. Фактический режим card click проверен через performance.timeOrigin: название старого test ID не использовано как доказательство SPA, обнаружена hard navigation F17 и отдельно проверены настоящие Next Links. Нет обещаний конкретного production ускорения по модели, нет списания всей задержки на SDK/CMS без server traces, нет автоматического предложения ослабить бюджеты. Source-integrity и git status проверяют отсутствие изменений исходников и lockfiles; новые файлы только в docs/audit. Изолированная копия и browser artifacts остаются для воспроизведения, ничего не удалено.
