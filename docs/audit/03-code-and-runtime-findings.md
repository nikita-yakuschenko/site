# Реестр проблем и рисков

Аудит 28 октября 2026 года (Europe/Moscow). Снимок репозитория HEAD c544500b9a80946deb53829e5942053c1d78f5bc; незакоммиченные изменения перечислены в [git-status-before.txt](artifacts/git-status-before.txt). Аудит диагностический: исходники, зависимости, lockfiles, CMS, production-настройки и workflows не исправлялись.

Статусы: **CONFIRMED** — воспроизводимое измерение/наблюдение; **CODE-EVIDENCED** — механизм виден в коде, runtime-ущерб не измерен; **HYPOTHESIS** — требует проверки; **NOT VERIFIED** — не проверено; **PASSED** — выполненная проверка с ограниченным указанным охватом. PASSED не означает доказанного отсутствия любых проблем.

| ID | Статус | Приоритет | Категория | Проблема |
| --- | --- | --- | --- | --- |
| F01 | CONFIRMED | P1 | Production TTFB | Главная и каталог превышают бюджет TTFB |
| F02 | CONFIRMED | P1 | Mobile rendering | Мобильные FCP и LCP не укладываются в бюджет |
| F03 | CONFIRMED | P1 | SSR architecture | Общие CMS-настройки и полный каталог находятся на критическом пути layout |
| F04 | CONFIRMED | P1 | Project waterfall | Карточка проекта ожидает несколько последовательных фаз CMS |
| F05 | CONFIRMED | P1 | Resilience and status semantics | Сбой CMS маскируется пустым каталогом и 404 проекта |
| F06 | CONFIRMED | P1 | Media transfer | Локальные hero и часть карточек передаются одним крупным вариантом |
| F07 | CONFIRMED | P2 | Client bundle | В клиентскую сборку включён общий реестр 760 изображений |
| F08 | CONFIRMED | P2 | CSS payload | Общая таблица стилей обслуживает все страницы |
| F09 | CODE-EVIDENCED | P1 | CMS database and CPU | CMS читает целые наборы блоков и цен вместо узких выборок |
| F10 | CONFIRMED | P2 | Freshness contract | Каталог остаётся старым после обновления CMS до фоновой revalidation |
| F11 | CODE-EVIDENCED | P1 | Observability and CI | В репозитории нет количественных performance-gates и CWV RUM |
| F12 | CONFIRMED | P2 | Quality tooling | Штатный frontend lint завершается с ошибкой |
| F13 | CONFIRMED | P2 | Release traceability | Production сайт сообщает commit:unknown |
| F14 | CODE-EVIDENCED | P2 | Infrastructure configuration | Одна реплика и отсутствие явных лимитов в настройках двух приложений |
| F15 | CODE-EVIDENCED | P2 | Dead assets | Неиспользуемая модульная сцена сохраняет 82 MB кадров в public |
| F16 | CONFIRMED | P2 | Fonts transfer | Factory Open Day передаёт около 876 KB двух TTF-шрифтов |
| F17 | CONFIRMED | P1 | Navigation | Основные ссылки карточки выполняют полную навигацию документа |


## F01. Главная и каталог превышают бюджет TTFB

**CONFIRMED · P1 · Production TTFB**

- Маршруты/сценарии: /, /catalog.
- Точка кода: `src/app/layout.tsx:61` (production config findings ссылаются также на runtime artifact).
- Описание и первопричина: Повторяемое превышение подтверждено браузером и curl. SSR зависит от CMS; точный вклад каждого production upstream без серверной трассировки не установлен. DNS/TCP/TLS не объясняют основную часть задержки.
- Доказательства: [production-validated-browser-runs.json](artifacts/production-validated-browser-runs.json); [production-http.json](artifacts/production-http.json).
- Фактическое/вероятное влияние: Первый байт медленнее 400 мс в обоих профилях. Нельзя считать результат локального fixture-сервера показателем production.
- Охват/частота: Все входы на главную и каталог; в исследованной серии регулярно.
- Предложение: Сначала добавить spans proxy/layout/CMS и разделить cache hit/miss. Затем устранить подтверждённые последовательные зависимости F03/F04 и повторить production GET.
- Проверка после исправления: Пять и более повторов на маршрут и профиль, отдельно cold/warm cache; TTFB ≤400 мс, предпочтительно ≤200 мс.
- Сложность: M; риск регрессии: Средний: регион, согласие и актуальность CMS должны сохраниться.; зависимости: F03, F04, F11

## F02. Мобильные FCP и LCP не укладываются в бюджет

**CONFIRMED · P1 · Mobile rendering**

- Маршруты/сценарии: /, /catalog; локально также карточка, manufacture, mortgage, stories.
- Точка кода: `src/app/layout.tsx:37` (production config findings ссылаются также на runtime artifact).
- Описание и первопричина: В заданном профиле 4× CPU / 1,6 Мбит/с критическая цепочка HTML → CSS/шрифт → отрисовка превышает бюджет; дополнительно каталог ждёт изображения. Это составной результат, а не доказательство одного виновного компонента.
- Доказательства: [production-validated-browser-runs.json](artifacts/production-validated-browser-runs.json); [local-browser-runs.json](artifacts/local-browser-runs.json); [trace-home-mobile.json](artifacts/trace-home-mobile.json).
- Фактическое/вероятное влияние: Посетитель позже видит основное содержимое. Production главная имеет текстовый LCP h1: нельзя приписывать её LCP только фотографии.
- Охват/частота: Мобильный профиль; все пять production повторов каждого маршрута.
- Предложение: Профилировать критическую цепочку, уменьшить обязательный CSS/JS и объём медиа; исправления проверять по метрикам, сохраняя дизайн и сценарии.
- Проверка после исправления: На том же профиле LCP ≤1500 мс, FCP ≤1800 мс; после внедрения дополнительно p75 RUM.
- Сложность: L; риск регрессии: Средний: изменения CSS и загрузки шрифтов могут менять геометрию.; зависимости: F01, F06, F07, F08

## F03. Общие CMS-настройки и полный каталог находятся на критическом пути layout

**CONFIRMED · P1 · SSR architecture**

- Маршруты/сценарии: Все страницы, включая /privacy и marketing.
- Точка кода: `src/app/layout.tsx:61` (production config findings ссылаются также на runtime artifact).
- Описание и первопричина: activeMetricaCounterId → activeRoistatProjectId → readCMSContent → catalog.list последовательно await в layout. readCMSContent иногда запускается раньше из страницы и дедуплицируется React.cache, поэтому задержки всех четырёх вызовов нельзя механически складывать. Полный каталог нужен для одного boolean readyHouses. Дополнительно глобальная NotFound boundary (src/app/not-found.tsx:18–19) получает popular projects: соответствующий запрос наблюдён даже на обычной200-странице /privacy. Его отдельный вклад в initial TTFB не изолирован.
- Доказательства: [server-experiments.json](artifacts/server-experiments.json); [server-experiments.log](artifacts/server-experiments.log).
- Фактическое/вероятное влияние: В локальной модели /privacy: медиана TTFB 326 →1323 мс при добавлении 250 мс каждому upstream. Это причинный эксперимент, не прогноз ускорения production на 997 мс.
- Охват/частота: Все HTML-запросы; сильнее при холодном кеше/сбое CMS.
- Предложение: Параллелить независимые настройки, получать availability компактно, вынести некритичные зависимости из общего критического пути. Сохранить SSR-регион и согласие. При этом отдельно облегчить неиспользуемую на200-странице data dependency NotFound boundary: одного изменения availability может оказаться недостаточно.
- Проверка после исправления: Повторить server-experiments с тем же fixture набором: настройки стартуют параллельно; измерить TTFB и корректность всех страниц.
- Сложность: M; риск регрессии: Средний.; зависимости: Нужна договорённость о свежести общих настроек.

## F04. Карточка проекта ожидает несколько последовательных фаз CMS

**CONFIRMED · P1 · Project waterfall**

- Маршруты/сценарии: /catalog/[slug].
- Точка кода: `src/app/catalog/[slug]/page.tsx:106` (production config findings ссылаются также на runtime artifact).
- Описание и первопричина: После hero последовательно идут reactions, группа из шести параллельных resolvers, page-order и общий catalog. Promise.all уже есть внутри группы; рекомендация касается фаз между группами. generateMetadata/hero повторно не обвиняются: resolveProjectHero обёрнут в React.cache.
- Доказательства: [server-experiments.json](artifacts/server-experiments.json).
- Фактическое/вероятное влияние: При 250 мс upstream TTFB карточки 180 →1166 мс; в модели десять CMS-запросов для карточки, часть endpoint возвращает 404 и включает штатные fallback.
- Охват/частота: Каждый прямой вход/переход в карточку при промахах кеша.
- Предложение: Начинать независимые page-order/reactions/галереи раньше, объединить пересекающиеся публичные данные или выбрать необходимое, рассмотреть Suspense для некритических секций.
- Проверка после исправления: Таймлайн запросов и пять повторов; проверить hero, цены, галереи, порядок блоков, реакции и metadata.
- Сложность: M–L; риск регрессии: Средний: нельзя смешать данные разных slug или регионов.; зависимости: F11; согласовать контракт CMS.

## F05. Сбой CMS маскируется пустым каталогом и 404 проекта

**CONFIRMED · P1 · Resilience and status semantics**

- Маршруты/сценарии: /catalog, /catalog/[slug], /api/health.
- Точка кода: `src/lib/catalog/cms-provider.ts:22` (production config findings ссылаются также на runtime artifact).
- Описание и первопричина: Неуспешный fetch возвращает [], catch тоже возвращает []; getBySlug превращает отсутствие в null, page вызывает notFound. Health проверяет только процесс. Наличие stale Data Cache защищает часть тёплых запросов, но не холодный путь.
- Доказательства: [cache-failure-experiment.json](artifacts/cache-failure-experiment.json); [cache-failure-experiment.log](artifacts/cache-failure-experiment.log).
- Фактическое/вероятное влияние: Пять локальных повторов CMS 503: каталог 200 без проекта, существующий в модели slug 404, health 200 ok. Возможны ложное отсутствие товаров и неверные сигналы мониторинга; production outage не воспроизводился.
- Охват/частота: Холодные экземпляры и отсутствующие записи кеша во время отказа CMS.
- Предложение: Различать not-found и upstream-unavailable, предусмотреть last-known-good и явное состояние недоступности; отдельно readiness/синтетика каталога. Сохранить liveness как проверку процесса.
- Проверка после исправления: Холодный/тёплый кеш при 401/503/timeout; корректные статусы и сообщение пользователю; восстановление без перезапуска.
- Сложность: M; риск регрессии: Средний: политика fallback влияет на актуальность цен.; зависимости: F10, F11

## F06. Локальные hero и часть карточек передаются одним крупным вариантом

**CONFIRMED · P1 · Media transfer**

- Маршруты/сценарии: /manufacture, /stories, /business и fixture-каталог.
- Точка кода: `src/components/page-hero.tsx:65` (production config findings ссылаются также на runtime artifact).
- Описание и первопричина: PageHero использует unoptimized+preload; prepare-webp-assets выбирает lossless для всех PNG без уменьшения, optimizedSrc для локальных файлов игнорирует width. sizes без реального srcset не создаёт уменьшенных вариантов. CMS-фото, проходящие /_next/image, имеют отдельную responsive-стратегию и не включаются в это обобщение.
- Доказательства: [image-encoding-experiments.json](artifacts/image-encoding-experiments.json); [local-browser-runs.json](artifacts/local-browser-runs.json); [bundle-files.json](artifacts/bundle-files.json).
- Фактическое/вероятное влияние: Stories hero 1 529 970 байт, manufacture hero 1 067 886 байт; desktop manufacture около 8,95 MB в окне загрузки. Большие исходники, которые не запрашиваются браузером, отдельно проблемой загрузки не объявлены.
- Охват/частота: Каждая холодная загрузка соответствующей страницы.
- Предложение: Ввести responsive варианты для востребованных локальных медиа, сохранить прозрачность и детализацию, подобрать параметры по визуальному сравнению. Не подменять все img на Image автоматически: текущий Image тоже бывает unoptimized.
- Проверка после исправления: Network, реальное разрешение/DPR, screenshots и сравнение качества. Кандидаты q85 в артефакте — только оценка байтов, качество NOT VERIFIED.
- Сложность: M; риск регрессии: Средний: alpha и детали материалов/чертежей важны.; зависимости: Согласованная визуальная приёмка.

## F07. В клиентскую сборку включён общий реестр 760 изображений

**CONFIRMED · P2 · Client bundle**

- Маршруты/сценарии: Общие компоненты, использующие src/lib/media.ts.
- Точка кода: `src/lib/media.ts:1` (production config findings ссылаются также на runtime artifact).
- Описание и первопричина: media.ts импортирует JSON-словарь целиком, lookup по динамическому ключу удерживает его в клиентском графе. Analyzer part: 72 151 байт, отдельная оценка compressed part 13 778 байт.
- Доказательства: [bundle-attribution.json](artifacts/bundle-attribution.json); [bundle-graph.jsonl](artifacts/bundle-graph.jsonl).
- Фактическое/вероятное влияние: Обязательные JS-данные и разбор словаря на страницах, которым нужна малая часть реестра. Сумма compressed parts не равна gzip всего HTTP-chunk.
- Охват/частота: Широкий охват; вклад в INP не измерен.
- Предложение: Исследовать перенос разрешения локальных URL на build/server либо ограниченные словари по маршрутам. Сначала подтвердить размер реально загружаемого chunk.
- Проверка после исправления: Повторить next analyze export и Network: словарь не входит в общий клиентский путь; все ссылки и rewrites работают.
- Сложность: M; риск регрессии: Средний: возможны битые пути.; зависимости: F06

## F08. Общая таблица стилей обслуживает все страницы

**CONFIRMED · P2 · CSS payload**

- Маршруты/сценарии: Все страницы публичного сайта.
- Точка кода: `src/app/layout.tsx:37` (production config findings ссылаются также на runtime artifact).
- Описание и первопричина: styles.css импортирован в root layout. Analyzer: 236 209 байт, compressed part 39 835 байт. Значительная часть правил относится к другим страницам; точная доля начального использования сохранена в coverage.json.
- Доказательства: [bundle-attribution.json](artifacts/bundle-attribution.json); [coverage.json](artifacts/coverage.json); [local-browser-runs.json](artifacts/local-browser-runs.json).
- Фактическое/вероятное влияние: CSS блокирует первый paint и парсится на каждом холодном входе. Coverage относится к начальному viewport и не доказывает, что правила вообще не нужны (hover, модалы, адаптивность).
- Охват/частота: Все холодные входы.
- Предложение: Выделить стили функциональных страниц, сохранить общие tokens/layout; не удалять правила лишь по начальному coverage.
- Проверка после исправления: Повтор CSS coverage после взаимодействий и на обоих профилях; FCP/CLS и визуальные скриншоты всех затронутых страниц.
- Сложность: M; риск регрессии: Повышенный риск визуальных регрессий.; зависимости: Сначала визуальная матрица состояний.

## F09. CMS читает целые наборы блоков и цен вместо узких выборок

**CODE-EVIDENCED · P1 · CMS database and CPU**

- Маршруты/сценарии: CMS /api/blocks/content?all=1; /api/projects/catalog.
- Точка кода: `cms/src/collections/block-content-endpoint.ts:23` (production config findings ссылаются также на runtime artifact).
- Описание и первопричина: Блоки выбираются pagination:false depth:1 до фильтрации по route в JS. Каталог после выборки проектов читает все цены даже при slug; для каждого проекта выполняет find/filter по общему массиву цен (O(P×R)). Это не доказанный SQL N+1: фактическое число SQL при population не измерено.
- Доказательства: [modules.json](artifacts/modules.json); исходники cms/src/collections/project-catalog-endpoint.ts:15–28.
- Фактическое/вероятное влияние: Стоимость зависит от полного размера CMS, а не только страницы. Возможное давление на pool max:10; реальные p95 SQL, планы, CPU и объёмы таблиц недоступны.
- Охват/частота: Все uncached блоки и cache misses каталога; частота CMS блока — каждый SSR при configured key.
- Предложение: Фильтровать scope/ключи и цены в запросе, выбирать поля, строить Map цен за один проход; до изменения получить EXPLAIN и фактический SQL/payload.
- Проверка после исправления: На безопасной копии БД: SQL count/latency/payload до и после, EXPLAIN (ANALYZE, BUFFERS), тест published/access/media.
- Сложность: M; риск регрессии: Средний: нельзя нарушить access control и общие блоки.; зависимости: Доступ к обезличенной БД/трассам.

## F10. Каталог остаётся старым после обновления CMS до фоновой revalidation

**CONFIRMED · P2 · Freshness contract**

- Маршруты/сценарии: Каталог, hero, счётчики и другие revalidate:60 fetch.
- Точка кода: `src/lib/catalog/cms-provider.ts:21` (production config findings ссылаются также на runtime artifact).
- Описание и первопричина: next.revalidate:60 использует persistent Data Cache. Пять немедленных запросов после A→B видели A; первый запрос после 62 с тоже A и запустил revalidation, следующий спустя 1 с увидел B. Content blocks при этом no-store. On-demand invalidation в исследованном коде нет.
- Доказательства: [cache-failure-experiment.json](artifacts/cache-failure-experiment.json); локальная документация Next fetch/revalidateTag.
- Фактическое/вероятное влияние: Это воспроизведённая политика кеша, не нарушение неизвестного SLA. Возможна смешанная свежесть текста и цены. При ошибках upstream срок stale может превышать 60 с.
- Охват/частота: После публикаций/изменения цен.
- Предложение: Согласовать SLA публикации и допустимость stale цен; при необходимости добавить адресную invalidation с аутентификацией, сохранив преимущества кеша.
- Проверка после исправления: Локальная CMS A→B; cold/warm, первый запрос после TTL, ошибка revalidation и восстановление; production CMS не менять.
- Сложность: M; риск регрессии: Средний: бездумный no-store увеличит TTFB и нагрузку.; зависимости: Решение владельца продукта о свежести.

## F11. В репозитории нет количественных performance-gates и CWV RUM

**CODE-EVIDENCED · P1 · Observability and CI**

- Маршруты/сценарии: Все маршруты и релизы.
- Точка кода: `.github/workflows/browser-release-quality.yml:1` (production config findings ссылаются также на runtime artifact).
- Описание и первопричина: Есть browser quality/smoke, CMS unit/build и ежедневный browser audit. Нет LCP/FCP/TBT/TTFB/bundle thresholds, измерения INP p75 и централизованных server spans в исследованном коде. Внешние системы наблюдаемости вне доступных источников не исключаются.
- Доказательства: [diagnostic-unit-tests.log](artifacts/diagnostic-unit-tests.log); исходники .github/workflows и diagnostics/probe.ts; docs/browser-diagnostics.md:75.
- Фактическое/вероятное влияние: Релиз может пройти функциональный gate с ухудшением скорости. Metrica/VK/Roistat сами по себе не подтверждают сбор заданных CWV и error rate.
- Охват/частота: Каждый релиз и реальные посещения.
- Предложение: Ввести минимальные gates из 06-regression-strategy.md и RUM без персональных данных; связать со сборкой и revision.
- Проверка после исправления: Контролируемая регрессия >10% блокирует gate; RUM проверен для route/device/release и содержит p75 с объёмом выборки.
- Сложность: M; риск регрессии: Низкий–средний: шумные gates требуют стабильного стенда.; зависимости: F13; стабильный baseline.

## F12. Штатный frontend lint завершается с ошибкой

**CONFIRMED · P2 · Quality tooling**

- Маршруты/сценарии: Проверка проекта.
- Точка кода: `scripts/index-site.mjs:69` (production config findings ссылаются также на runtime artifact).
- Описание и первопричина: Две ошибки @next/next/no-assign-module-variable (69,91) и react-hooks/purity для Date.now в src/app/factory-open-day/page.tsx:33; 29 предупреждений. Ошибка purity не доказывает runtime hydration mismatch в async Server Component.
- Доказательства: [lint.log](artifacts/lint.log).
- Фактическое/вероятное влияние: Команда npm run lint имеет ненулевой exit code; lint нельзя считать пройденным. Это не P0 и не доказательство плохого пользовательского INP.
- Охват/частота: Каждый запуск lint.
- Предложение: Отдельной задачей устранить либо обоснованно настроить правила для build scripts/Server Components; текущий аудит ничего не исправляет.
- Проверка после исправления: npm run lint exit 0; сохранить функциональные проверки.
- Сложность: S; риск регрессии: Низкий.; зависимости: Нет.

## F13. Production сайт сообщает commit:unknown

**CONFIRMED · P2 · Release traceability**

- Маршруты/сценарии: /api/health.
- Точка кода: `next.config.ts:21` (production config findings ссылаются также на runtime artifact).
- Описание и первопричина: APP_COMMIT имеет fallback unknown и не был передан/сохранён в наблюдаемой сборке сайта. CMS сообщает c544500…, совпадающий с локальным HEAD, но это не подтверждает revision публичного сайта.
- Доказательства: [deployed-revisions.json](artifacts/deployed-revisions.json); commit.txt.
- Фактическое/вероятное влияние: Нельзя строго связать production baseline с конкретным git commit и сравнить регрессию одного релиза; локальный незакоммиченный CMS-код также отличается от HEAD.
- Охват/частота: Наблюдаемое текущее развёртывание.
- Предложение: Передавать точный revision в build и health, сохранять build ID в артефактах и RUM.
- Проверка после исправления: После следующего согласованного релиза health возвращает ожидаемый commit; smoke проверяет совпадение.
- Сложность: S; риск регрессии: Низкий.; зависимости: CI/CD build metadata.

## F14. Одна реплика и отсутствие явных лимитов в настройках двух приложений

**CODE-EVIDENCED · P2 · Infrastructure configuration**

- Маршруты/сценарии: Развёрнутые frontend и CMS.
- Точка кода: `Dockerfile:1` (production config findings ссылаются также на runtime artifact).
- Описание и первопричина: Dokploy application.one: replicas:1, cpuLimit/memoryLimit/reservations:null у сайта и CMS. Это настройки приложений, не измерение фактических cgroup limits или загрузки хоста; общий уровень ограничений не проверен.
- Доказательства: [deployment-sanitized.json](artifacts/deployment-sanitized.json).
- Фактическое/вероятное влияние: Риск конкуренции за ресурсы и единственной точки отказа. OOM/перегрузка/простой не подтверждены.
- Охват/частота: При сбоях и пиках; частота неизвестна.
- Предложение: Получить фактические метрики, контейнерные limits и memory profile; выбирать reservations/limits и стратегию реплик по испытанию, не назначать произвольные RAM/CPU.
- Проверка после исправления: docker inspect/stats и cgroup на стенде, bounded load/recovery, graceful rollout и доступность общего хранилища CMS.
- Сложность: M–L; риск регрессии: Высокий при масштабировании CMS с локальными media/worker без проектирования.; зависимости: Отдельно разрешённое нагрузочное испытание.

## F15. Неиспользуемая модульная сцена сохраняет 82 MB кадров в public

**CODE-EVIDENCED · P2 · Dead assets**

- Маршруты/сценарии: Не включена в текущий маршрут /manufacture.
- Точка кода: `scripts/package-public-assets.mjs:18` (production config findings ссылаются также на runtime artifact).
- Описание и первопричина: ManufactureModuleScene не импортируется маршрутами и отсутствует в client build graph. Четыре JSON-манифеста содержат 183 WebP-кадра, 82 048 012 байт; packaging копирует public/video. Исходные записи CMS о названии блока не монтируют React-компонент.
- Доказательства: [bundle-graph.jsonl](artifacts/bundle-graph.jsonl); [modules.json](artifacts/modules.json); [public-assets.json](artifacts/public-assets.json).
- Фактическое/вероятное влияние: Возможный лишний размер runtime image/хранилища, а не текущие 82 MB трафика посетителя. В браузерной загрузке /manufacture запросов framing нет. Предположение о четырёх активных декодерах отвергнуто.
- Охват/частота: Каждая будущая Docker-сборка по текущей упаковке.
- Предложение: Уточнить, планируется ли возврат сцены; при подтверждении исключить неиспользуемые assets из runtime packaging, сохранив исходники отдельно.
- Проверка после исправления: Manifest/образ после упаковки, отсутствие сломанных ссылок, browser /manufacture; не удалять файлы до решения владельца.
- Сложность: S; риск регрессии: Низкий–средний: контент может быть запланирован.; зависимости: Решение о жизненном цикле сцены.

## F16. Factory Open Day передаёт около 876 KB двух TTF-шрифтов

**CONFIRMED · P2 · Fonts transfer**

- Маршруты/сценарии: /factory-open-day.
- Точка кода: `src/app/factory-open-day/page.tsx:13` (production config findings ссылаются также на runtime artifact).
- Описание и первопричина: next/font/local ссылается на полные variable TTF Inter/Unbounded; в этой сборке они копируются как TTF, а не конвертируются в WOFF2. Исходные размеры876576+778272 B, реальный compressed transfer одного desktop прогона469609+406638 B; дополнительно глобально preloaded Geist58812 B.
- Доказательства: [local-open-day-browser-runs.json](artifacts/local-open-day-browser-runs.json); [bundle-files.json](artifacts/bundle-files.json).
- Фактическое/вероятное влияние: Шрифты составляют значимую часть1.41MB наблюдённой загрузки этой страницы. Display swap уже позволяет fallback paint; нельзя приписывать им всю задержку FCP или объявлять CLS0.0177 нарушением бюджета0.1.
- Охват/частота: Каждое холодное посещение landing page.
- Предложение: Проверить WOFF2 варианты/безопасный subset с сохранением кириллицы, нужных начертаний и осей. Исследовать необходимость общего Geist preload на этой отдельной landing page. Не убирать фирменные шрифты ради уменьшения байтов.
- Проверка после исправления: Пять повторов desktop/mobile, Network font bytes, русские тексты/цифры/пунктуация/все состояния; FCP/LCP/CLS. Экономия после перекодирования пока не измерена.
- Сложность: S–M; риск регрессии: Средний: glyph coverage, fallback metrics и лицензия исходных font assets.; зависимости: Визуальная типографическая приёмка.

## F17. Основные ссылки карточки выполняют полную навигацию документа

**CONFIRMED · P1 · Navigation**

- Маршруты/сценарии: /catalog → /catalog/[slug], также переиспользуемые ProjectCard.
- Точка кода: `src/components/project-card.tsx:44` (production config findings ссылаются также на runtime artifact).
- Описание и первопричина: Изображение, название и CTA ProjectCard используют обычный a, не Next Link. В десяти кликах (5 desktop+5 mobile) performance.timeOrigin менялся. Для контроля Next Link главная→каталог в десяти повторениях сохранял timeOrigin. Это разные маршруты, их времена не являются causal A/B сравнением скорости.
- Доказательства: [interactions.json](artifacts/interactions.json); [navigation-repeats.log](artifacts/navigation-repeats.log); [client-link-navigation.json](artifacts/client-link-navigation.json).
- Фактическое/вероятное влияние: При открытии проекта пересоздаются документ, shell/providers и hydration; не используется client Router Cache перехода к карточке. Точный прирост задержки относительно Link для того же маршрута не измерен; фильтрация и обычные nav Links уже работают как SPA.
- Охват/частота: Каждый обычный клик по изображению, названию или CTA проекта.
- Предложение: Проверить наличие причины для hard navigation; если она не нужна, использовать Next Link для внутренних project href с осознанной prefetch-политикой, сохранив modified click/new-tab/scroll и бизнес-состояние.
- Проверка после исправления: Тот же catalog→project сценарий5раз/профиль: timeOrigin сохраняется, цены/регион/analytics navigation/preview/Back корректны; сравнить navigation latency и network до/после.
- Сложность: S–M; риск регрессии: Средний: нужно проверить состояния и lifecycle сторонних интеграций при client navigation.; зависимости: Согласовать, не является ли full reload намеренным требованием.


## Проверенные ложноположительные кандидаты

1. Три цикла в syntactic local-import-cycles.json замыкаются import type: popular-projects→LayoutBlock, series-bento→LayoutBlock, frame-tiers→ProjectTier. Они не объявлены runtime cycles.
2. Повторный вызов catalog.list в CatalogPage использует React.cache readCatalog; он не автоматически означает повторный HTTP catalog fetch. В mock warm /catalog наблюдался только uncached blocks/content.
3. generateMetadata и ProjectPage используют resolveProjectHero=React.cache. Без trace нельзя обвинять их в двух одинаковых запросах.
4. ManufactureModuleScene не смонтирована и отсутствует в production graph: расчёт её потенциальных4×memory budgets не описывает текущую страницу. В baseline framing requests=0.
5. PNG оригинал16,6 MB из largest-images не равен network transfer: часть заменяется WebP rewrite, часть не используется. F06 основан на реально запрошенных вариантах и конкретном unoptimized пути.
6. Root Client Providers не делают переданные server children клиентскими автоматически.
7. 29 lint warnings о img не являются29 performance дефектами: часть img уже использует собственный responsive CMS optimizer.
8. Ненулевой CLS, большой DOM и длинный файл сами по себе не означают нарушение бюджета или необходимость memoization.
9. Отсутствие данных после401 локального token не объявлено неисправностью production CMS; production health/ready были200.
10. Нулевые pageerror при заблокированных SDK не доказывают совместимость live CAPTCHA/Metrica/Roistat с гидратацией.

## Гипотезы, не включённые в число подтверждённых дефектов

- H01: при growth CMS population depth1/2 может образовать SQL N+1/expensive JOIN; нужны query count и планы. Пара pagination:false+depth не доказывает N+1.
- H02: blur/glass filters или scroll callbacks могут ухудшать paint/compositing на слабом GPU; нужны GPU/interaction traces, а не оценка CSS по имени свойства.
- H03: background analytics/webvisor может увеличить CPU/INP; live SDK cost не измерен и immediate load является действующей бизнес-политикой.
- H04: CPU contention, OOM или swap на VPS могут усиливать TTFB; metrics endpoint пустой, состояние host по Dockerfile не выводится.
- H05: несогласованная свежесть blocks no-store / catalog60 / media30д может показывать переходное сочетание данных; измерено SWR каталога, но реальная пользовательская неконсистентность на публикации CMS не воспроизводилась.
