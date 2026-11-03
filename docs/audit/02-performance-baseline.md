# Измерения производительности

Аудит 28 октября 2026 года (Europe/Moscow). Снимок репозитория HEAD c544500b9a80946deb53829e5942053c1d78f5bc; незакоммиченные изменения перечислены в [git-status-before.txt](artifacts/git-status-before.txt). Аудит диагностический: исходники, зависимости, lockfiles, CMS, production-настройки и workflows не исправлялись.

Статусы: **CONFIRMED** — воспроизводимое измерение/наблюдение; **CODE-EVIDENCED** — механизм виден в коде, runtime-ущерб не измерен; **HYPOTHESIS** — требует проверки; **NOT VERIFIED** — не проверено; **PASSED** — выполненная проверка с ограниченным указанным охватом. PASSED не означает доказанного отсутствия любых проблем.

## Воспроизведение и среда

[environment.json](artifacts/environment.json); CPU Intel(R) Core(TM) i3-10100F CPU @ 3.60GHz, 8 logical CPUs, RAM 15.87 GiB, Windows 10.0.26300, Node v22.13.1. Браузер Chromium 153.0.8010.12. Физическая география host не установлена; timezone Europe/Moscow не означает географию. Production — реальная WAN сеть host; local —127.0.0.1 HTTP без DNS/TLS. Точная аппаратная эмуляция телефона отсутствует, mobile CPU throttling4× выполняется на desktop CPU.

Изолированная копия D:/site-audit-20261028; полный npm run build с prebuild. Исходники совпали с начальным снимком, кроме **ожидаемо сгенерированного** src/data/webp-assets.json; локальная копия не содержит .env/production secrets. [isolation-diff.json](artifacts/isolation-diff.json). Standalone server запущен на127.0.0.1:3107; CMS_PUBLIC_URL localhost:9, BROWSER_DIAGNOSTICS_FIXTURE_CATALOG=1. Таким образом SSR timings local показывают fixture путь и fallback, а не production CMS. Каталог fixtures38 проектов; local stories feed пуст из-за отсутствия CMS key.

Команды (PowerShell, из D:/site; новую сборку выполнять только в отдельной копии):

~~~powershell
node docs/audit/artifacts/serve-local.mjs
node docs/audit/artifacts/browser-baseline.mjs http://127.0.0.1:3107
$env:AUDIT_TAG='production-validated'
node docs/audit/artifacts/browser-baseline.mjs https://avgst.ru / /catalog
node docs/audit/artifacts/http-probe.mjs
node docs/audit/artifacts/server-experiments.mjs
node docs/audit/artifacts/cache-failure-experiment.mjs
node docs/audit/artifacts/repeat-visits.mjs
node docs/audit/artifacts/interactions.mjs
node docs/audit/artifacts/navigation-repeats.mjs
node docs/audit/artifacts/client-link-navigation.mjs
node docs/audit/artifacts/filter-repeats.mjs
node docs/audit/artifacts/modal-soak-short.mjs
node docs/audit/artifacts/coverage.mjs
node docs/audit/artifacts/summarize.mjs
node docs/audit/artifacts/write-reports.mjs
~~~

Сначала завершить тяжёлую подготовку и предыдущие browser runners. Scripts с фиксированными localhost ports требуют свободных3107/3117/3118. Повторный запуск пишет собственные диагностические outputs; ни один script не устанавливает dependencies. HTTP probe выполняет25 обычных последовательных GET, без concurrency/load на production.

Каждая cold-browser строка — новый BrowserContext с пустым HTTP cache. Серверный process/image/Data Cache не сбрасывались между browser runs; первый local home run включает cold process/module initialization и не исключён из пяти точек. Это browser-cold/server-mostly-warm baseline. Кеши контролируются отдельно в причинных экспериментах. Не следует сравнивать этот cold process outlier с медианой после оптимизации.

Desktop1440×900/DPR1/no CPU throttle/no network throttle. Mobile390×844/DPR3/touch, CPU4×, latency150 ms, download200000 B/s, upload93750 B/s. Используется CDP, Playwright routing в cold/repeat runner не включён, чтобы не отключать HTTP cache. Во всех production browser runs mutations и сторонние trackers блокированы; new.avgst.ru/cms.avgst.ru static media/style/fonts разрешены. В initial exploratory production-* logos были заблокированы и окно было короче; **они не являются основным baseline**, использовать production-validated-*.

Окно наблюдения:5 с после DOMContentLoaded desktop,10 с mobile. Данные resources, bytes и LCP ограничены этим окном. Некоторые lazy/offscreen и продолжающиеся изображения могут не завершиться: bytes — lower bound, не полный transfer визита; последний LCP — последний наблюдённый кандидат. Превышение бюджета уже состоявшимся LCP подтверждено и при таком ограничении. Для production home mobile LCP=h1, фото complete: текстовый LCP не ошибка измерителя.

Host общий, абсолютная воспроизводимость CPU/network не гарантирована. Часть production-validated desktop серии пересекалась с prebuild/build/analyzer; raw разброс сохранён. Основная local browser серия начата после build/analyze/server experiments; лёгкая генерация отчётов и отдельный cache experiment могли идти параллельно. Ни одно лабораторное число не является RUM p75.

## Основной cold-browser baseline

Все времена мс. Медиана [min–max]; CLS безразмерный; MB десятичные. TTFB=responseStart от navigation start; request-only TTFB=responseStart−requestStart отдельно в JSON.

| Стенд | Маршрут | Профиль | n | TTFB | FCP | LCP | CLS | MB наблюдено | Requests |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| production-validated | / | desktop | 5 | 711 [561–821] | 896 [796–1056] | 896 [796–1056] | 0.000253 [0.000253–0.000253] | 1.59 [1.57–1.60] | 61 [61–61] |
| production-validated | /catalog | desktop | 5 | 742 [576–1153] | 960 [776–1328] | 1040 [856–1396] | 0.000253 [0.000253–0.000253] | 1.34 [1.32–1.36] | 62 [62–62] |
| production-validated | / | mobile | 5 | 786 [700–1014] | 3180 [3012–3496] | 3180 [3012–3496] | 0.000011 [0.000000–0.000011] | 0.63 [0.62–0.65] | 34 [34–34] |
| production-validated | /catalog | mobile | 5 | 716 [588–905] | 2904 [2680–3036] | 4252 [4048–4300] | 0.000000 [0.000000–0.000126] | 0.63 [0.61–0.64] | 37 [37–37] |
| local | / | desktop | 5 | 37 [30–1620] | 200 [188–1792] | 200 [188–1792] | 0.000253 [0.000253–0.000253] | 4.49 [4.33–6.54] | 61 [61–61] |
| local | /catalog | desktop | 5 | 36 [34–321] | 164 [160–452] | 232 [228–528] | 0.000253 [0.000253–0.000253] | 7.93 [7.37–9.53] | 63 [63–63] |
| local | /catalog/barhhouse-73 | desktop | 5 | 40 [30–388] | 192 [192–560] | 192 [192–560] | 0.000253 [0.000253–0.000253] | 4.51 [4.51–4.51] | 71 [71–71] |
| local | /manufacture | desktop | 5 | 26 [22–109] | 192 [144–240] | 192 [144–292] | 0.000253 [0.000253–0.000253] | 8.95 [8.95–8.95] | 58 [58–58] |
| local | /mortgage | desktop | 5 | 47 [42–258] | 216 [200–436] | 240 [200–436] | 0.000253 [0.000253–0.000253] | 4.34 [4.34–4.34] | 59 [59–59] |
| local | /stories | desktop | 5 | 17 [16–109] | 144 [128–304] | 164 [128–304] | 0.000720 [0.000720–0.000720] | 2.03 [2.03–2.03] | 62 [62–62] |
| local | / | mobile | 5 | 30 [26–33] | 2384 [2272–2568] | 2384 [2272–2568] | 0.000000 [0.000000–0.000000] | 1.92 [1.86–2.12] | 32 [32–32] |
| local | /catalog | mobile | 5 | 32 [30–41] | 2008 [1920–2128] | 10508 [3160–10596] | 0.000000 [0.000000–0.000000] | 1.31 [1.01–2.20] | 37 [37–37] |
| local | /catalog/barhhouse-73 | mobile | 5 | 37 [33–70] | 2444 [2392–2636] | 2444 [2392–2636] | 0.000000 [0.000000–0.000000] | 0.46 [0.46–0.46] | 50 [50–50] |
| local | /manufacture | mobile | 5 | 26 [21–29] | 2088 [2048–2320] | 2088 [2048–2320] | 0.000000 [0.000000–0.000000] | 0.84 [0.84–2.25] | 38 [38–38] |
| local | /mortgage | mobile | 5 | 206 [196–224] | 2868 [2820–2976] | 2868 [2820–2976] | 0.000000 [0.000000–0.000000] | 0.86 [0.86–0.86] | 41 [41–41] |
| local | /stories | mobile | 5 | 19 [18–24] | 1876 [1772–1964] | 11100 [11072–11140] | 0.000000 [0.000000–0.000000] | 2.12 [2.12–2.12] | 38 [38–38] |
| local-open-day | /factory-open-day | desktop | 5 | 16 [14–21] | 204 [200–240] | 204 [200–240] | 0.004880 [0.004880–0.004880] | 1.41 [1.41–1.41] | 34 [34–34] |
| local-open-day | /factory-open-day | mobile | 5 | 15 [14–24] | 1960 [1876–1964] | 1960 [1876–1964] | 0.017731 [0.017731–0.017731] | 1.42 [1.42–1.42] | 34 [34–34] |


[local-browser-runs.json](artifacts/local-browser-runs.json), [production-validated-browser-runs.json](artifacts/production-validated-browser-runs.json), [baseline-summary.json](artifacts/baseline-summary.json). Каждый raw record содержит значения конкретного прогона, NavigationTiming, PerformanceObserver, CDP metrics, request timings, headers allowlist, DOM и изображения. Никакие пять точек не скрыты за одной оценкой.

## Независимые production HTTP timings

| URL | n | DNS, мс | TCP, мс | TLS, мс | TTFB, мс | HTTP statuses |
| --- | --- | --- | --- | --- | --- | --- |
| https://avgst.ru/ | 5 | 15.5 [8.0–47.3] | 10.1 [8.3–10.8] | 54.4 [49.3–60.8] | 704.4 [644.4–1076.9] | 200,200,200,200,200 |
| https://avgst.ru/catalog | 5 | 11.0 [9.0–22.2] | 10.5 [9.5–10.7] | 49.5 [46.5–55.7] | 688.2 [608.5–950.1] | 200,200,200,200,200 |
| https://avgst.ru/api/health | 5 | 17.4 [11.3–22.3] | 9.7 [8.9–10.8] | 50.7 [43.8–59.9] | 85.1 [81.8–102.5] | 200,200,200,200,200 |
| https://cms.avgst.ru/api/health | 5 | 15.7 [9.9–42.4] | 10.2 [9.1–11.2] | 52.9 [49.1–61.6] | 90.9 [84.2–125.0] | 200,200,200,200,200 |
| https://cms.avgst.ru/api/ready | 5 | 18.2 [10.1–31.8] | 10.4 [9.8–10.7] | 58.5 [53.4–70.7] | 112.0 [88.2–300.0] | 200,200,200,200,200 |


curl — отдельное соединение на запрос, HTTP/1.1 данного Windows client; Chromium действительно negotiated h2. Времена curl TTFB включают DNS+TCP+TLS; серверный processing отделять через tracing, а не простое вычитание сетевой медианы. gzip подтверждён для HTML, private/no-store у HTML, no-store health. Нулевой 5xx на25 запросах не доказывает error rate<0.1%. У p95/p99 при n5 нет пригодной эксплуатационной точности; они не выдаются за SLO latency percentiles.

## LCP: элементы и decomposition

| Стенд / профиль / маршрут | Последний LCP run1 | TTFB | Load delay | Load duration | Render delay |
| --- | --- | --- | --- | --- | --- |
| production-validated / desktop / / | image: img | 561 | 10 | 99 | 127 |
| production-validated / desktop / /catalog | image: img | 576 | 173 | 56 | 51 |
| production-validated / mobile / / | text: h1 | 700 | — | — | 2796 |
| production-validated / mobile / /catalog | image: img.is-loaded | 661 | 2137 | 1229 | 258 |
| local / desktop / / | image: img | 1620 | 12 | 39 | 121 |
| local / desktop / /catalog | image: img | 321 | 103 | 22 | 82 |
| local / desktop / /catalog/barhhouse-73 | image: img | 388 | 8 | 27 | 137 |
| local / desktop / /manufacture | image: img | 109 | 7 | 49 | 63 |
| local / desktop / /mortgage | image: img.mortgage-family__image | 258 | 9 | 55 | 114 |
| local / desktop / /stories | image: img | 109 | 7 | 57 | 132 |
| local / mobile / / | text: h1 | 33 | — | — | 2387 |
| local / mobile / /catalog | image: img.is-loaded | 32 | 1942 | 7629 | 41 |
| local / mobile / /catalog/barhhouse-73 | text: h1 | 70 | — | — | 2566 |
| local / mobile / /manufacture | text: h1#manufacture-hero-title | 29 | — | — | 2031 |
| local / mobile / /mortgage | text: p | 198 | — | — | 2634 |
| local / mobile / /stories | image: img | 24 | 194 | 10848 | 33 |
| local-open-day / desktop / /factory-open-day | image: img | 21 | 8 | 28 | 172 |
| local-open-day / mobile / /factory-open-day | text: p.ags-hero__text | 15 | — | — | 1949 |


Для текста load delay/duration неприменимы, render delay = LCP−TTFB; для изображения сопоставлен ResourceTiming по точному URL. Эти составляющие одного run нельзя складывать с медианами других runs. LCP URLs и все пять decompositions сохранены в baseline-summary.json. Предзагрузка hero high priority уже есть, поэтому «добавить priority» не является общей рекомендацией.

## Main thread и DOM

| Стенд/профиль/маршрут | Script execution, мс | TaskDuration, мс | Observed blocking, мс | Max long task, мс | DOM / depth | Overflow |
| --- | --- | --- | --- | --- | --- | --- |
| production-validated/desktop / | 124 [101–144] | 588 [557–647] | 0 [0–0] | 50 [0–61] | 1177 [1177–1178] / 17 [17–17] | false |
| production-validated/desktop /catalog | 156 [133–218] | 427 [358–543] | 0 [0–33] | 60 [0–83] | 2917 [2917–2917] / 17 [17–17] | false |
| production-validated/mobile / | 470 [446–667] | 8192 [7581–8225] | 260 [165–382] | 218 [143–276] | 1166 [1166–1167] / 17 [17–17] | false |
| production-validated/mobile /catalog | 631 [609–762] | 2239 [2178–2484] | 380 [356–426] | 235 [187–244] | 2906 [2906–2906] / 17 [17–17] | false |
| local/desktop / | 90 [89–110] | 556 [544–573] | 0 [0–0] | 56 [50–60] | 1088 [1087–1088] / 17 [17–17] | false |
| local/desktop /catalog | 113 [111–126] | 337 [333–355] | 0 [0–0] | 53 [0–59] | 2255 [2255–2255] / 17 [17–17] | false |
| local/desktop /catalog/barhhouse-73 | 127 [118–138] | 642 [604–675] | 0 [0–0] | 50 [0–52] | 1109 [1109–1109] / 18 [18–18] | false |
| local/desktop /manufacture | 91 [81–97] | 482 [469–515] | 0 [0–0] | 0 [0–62] | 658 [658–658] / 15 [15–15] | false |
| local/desktop /mortgage | 117 [112–129] | 645 [620–669] | 0 [0–0] | 0 [0–72] | 1051 [1051–1051] / 18 [18–18] | false |
| local/desktop /stories | 87 [84–117] | 549 [539–692] | 0 [0–0] | 0 [0–87] | 514 [514–514] / 15 [15–15] | false |
| local/mobile / | 487 [476–494] | 7187 [6787–7759] | 206 [197–216] | 204 [199–220] | 1077 [1077–1077] / 17 [17–17] | false |
| local/mobile /catalog | 566 [564–763] | 2855 [2809–3154] | 360 [332–509] | 489 [447–507] | 2244 [2244–2244] / 17 [17–17] | false |
| local/mobile /catalog/barhhouse-73 | 782 [749–941] | 7338 [6726–7502] | 311 [298–402] | 825 [817–985] | 1098 [1098–1098] / 18 [18–18] | false |
| local/mobile /manufacture | 595 [441–830] | 6557 [5944–7201] | 297 [235–999] | 229 [200–841] | 647 [647–648] / 15 [15–15] | false |
| local/mobile /mortgage | 741 [674–975] | 7845 [7417–8428] | 458 [393–548] | 1043 [1008–1101] | 1040 [1040–1040] / 18 [18–18] | false |
| local/mobile /stories | 558 [524–575] | 5866 [5537–6101] | 360 [332–428] | 558 [453–586] | 503 [503–503] / 15 [15–15] | false |
| local-open-day/desktop /factory-open-day | 56 [54–76] | 416 [408–453] | 0 [0–0] | 52 [0–56] | 356 [356–356] / 12 [12–12] | false |
| local-open-day/mobile /factory-open-day | 319 [300–404] | 3478 [3384–3660] | 358 [320–483] | 231 [204–317] | 345 [345–345] / 12 [12–12] | false |


Observed blocking = Σ max(0,longtask.duration−50) для задач после FCP до окончания наблюдения. Это **не TBT Lighthouse**, не INP и не полевой responsiveness percentile. ScriptDuration — CDP суммарное исполнение JS; TaskDuration включает другую main-thread работу. Нет profiling build/React commit attribution. Traces: [trace-home-mobile.json](artifacts/trace-home-mobile.json), [trace-manufacture-mobile.json](artifacts/trace-manufacture-mobile.json).

CLS источники в raw data: site-office и соседние site-meta элементы меняют ширину при обновлении состояния; величины малы относительно0.1. Не следует назначать P1 за сам факт ненулевого CLS.

## Сеть, размеры и expensive dependencies

Selected waterfalls: файлы *-waterfall-*.json; initiator/type/priority/timing/encoded bytes/selected cache headers сохранены. Полные запросы и resources находятся в browser-runs; идентичные очищенные path могут быть разными RSC prefetch variant, их нельзя считать дублями без заголовков/полного key. Необоснованный preload или redirect loop в измеренных initial scenarios не подтверждён. Raw HAR с cookies/headers не создавался; сохранён безопасный эквивалент request waterfall без authorization/response bodies.

| Runtime package / shared source | Analyzer emitted bytes | Сумма compressed part estimates |
| --- | --- | --- |
| next | 673651 | 247547 |
| src/data/webp-assets.json.[json].cjs | 72151 | 13778 |
| src/lib/copy.ts | 59008 | 22816 |
| @radix-ui/react-collection | 50676 | 17794 |
| @radix-ui/react-select | 39298 | 13339 |
| src/components/referral-rules.tsx | 36894 | 7255 |
| @tabler/icons-react | 27620 | 16402 |
| @radix-ui/react-slider | 20480 | 7877 |
| src/components/photo-lightbox.tsx | 18873 | 6821 |
| @radix-ui/react-popover | 17544 | 6334 |
| @radix-ui/react-presence | 16098 | 6947 |
| @radix-ui/react-slot | 15942 | 7299 |
| src/components/mortgage-calculator.tsx | 15699 | 4854 |
| src/components/project-card.tsx | 15410 | 6039 |


Это emitted parts across unique client outputs всей сборки, **не** bytes одного визита и не additive HTTP gzip budget. Next включает скомпилированный React runtime; полный @tabler package на диске не уходит посетителю: analyzer содержит только импортированные icon parts. Реальный downloaded JS каждого run — requests с application/javascript. SmartCaptcha находится в async group; blanket замена UI dependencies не обоснована.

Сервер: [server-bundle-summary.json](artifacts/server-bundle-summary.json) —448 уникальных server outputs,4114213 байт без external node_modules/traced/native assets. [bundle-files.json](artifacts/bundle-files.json) — фактические file+gzip размеры статических outputs; [bundle-graph.jsonl](artifacts/bundle-graph.jsonl) — штатный Next16.4.3 analyzer export. Команды в isolated copy: next analyze --output; next analyze export. Это отдельный analyzer pass, не исходники приложений.

## CMS latency, failures и свежесть: причинные эксперименты

Mock CMS на ephemeral localhost port, обычный production Next server на3117/3118, BROWSER_DIAGNOSTICS_FIXTURE_CATALOG=0, fake local key; никакой production CMS content не менялся. У каждого из5 повторов условий0/250 мс — новый frontend process и уникальный origin cache key. Внутри процесса порядок /privacy→/catalog→/catalog/barhhouse-73 неизменен, поэтому /catalog — warm catalog, первая /privacy — cold process/cache.

| Страница | Upstream added delay | n | Медиана TTFB / диапазон, мс | Запросов в mock CMS |
| --- | --- | --- | --- | --- |
| /privacy | 0 | 5 | 326 [285–347] | 6 |
| /catalog | 0 | 5 | 105 [97–130] | 1 |
| /catalog/barhhouse-73 | 0 | 5 | 180 [157–196] | 10 |
| /privacy | 250 | 5 | 1323 [1311–1346] | 6 |
| /catalog | 250 | 5 | 336 [331–361] | 1 |
| /catalog/barhhouse-73 | 250 | 5 | 1166 [1151–1182] | 10 |


[server-experiments.json](artifacts/server-experiments.json). В изначальном harness end timestamp заполнялся через requests.at(-1) при конкурентных callbacks: **start order, url, route total/TTFB пригодны; per-request end values не использовать как точные concurrent durations**. Это ограничение диагностического скрипта, не дефект Next. Для чистого повтора скрипт далее исправлен на собственный record (если артефакт создан до исправления — ограничение остаётся).

CMS503 → catalog200/empty, project404, health200 воспроизведено5 раз. A→B: пять immediate visits staleA; first request после62с staleA с background fetch; следующий после1с B. [cache-failure-experiment.json](artifacts/cache-failure-experiment.json). Нормальное SWR не называется дефектом само по себе, но требует явно заданного content SLA.

## Повторные посещения

| Профиль | Маршрут | n | TTFB | FCP | LCP | Disk/prefetch cache flags | Network MB |
| --- | --- | --- | --- | --- | --- | --- | --- |
| desktop | / | 5 | 25 [23–29] | 128 [116–156] | 128 [116–156] | 1 [1–2] | 1.51 [0.68–3.81] |
| desktop | /catalog | 5 | 25 [23–29] | 96 [88–104] | 96 [88–104] | 1 [1–1] | 1.19 [0.03–2.91] |
| mobile | / | 5 | 24 [22–24] | 344 [316–356] | 344 [316–356] | 1 [1–1] | 0.33 [0.03–1.00] |
| mobile | /catalog | 5 | 30 [26–43] | 300 [280–340] | 3516 [1692–5144] | 1 [1–1] | 0.23 [0.19–0.77] |


[repeat-visits.json](artifacts/repeat-visits.json); это последовательные reload в сохранённом контексте после warm-up. Счётчик в таблице включает только CDP fromDiskCache/fromPrefetchCache, **не все memory-cache hits**: в raw resources многие same-origin записи имеют transferSize0 и decodedBodySize>0 (например,40 таких ресурсов при первом desktop reload каталога). Окно5с, поэтому byte totals не равны cold mobile10с; сравнивать конкретные resources, не обещать экономию всего визита из разности таблиц. Случайный набор popular projects на главной также меняет набор медиа между reload.

## CSS coverage, взаимодействия и память

| Маршрут | CSS bytes | CSS chars | Used initial chars | Initial unused % |
| --- | --- | --- | --- | --- |
| / | 240920 | 240916 | 50190 | 79.2 |
| /catalog | 242637 | 242633 | 21622 | 91.1 |
| /manufacture | 244772 | 244768 | 36219 | 85.2 |
| /factory-open-day | 284045 | 284039 | 25793 | 90.9 |


[coverage.json](artifacts/coverage.json); coverage pass отдельный и не влияет на основной baseline. Coverage не доказывает dead styles: модалы, табы, hover, mobile и scroll меняют использование.

| Профиль | Сценарий | n | Выполнено | Медиана времени сценария, мс |
| --- | --- | --- | --- | --- |
| desktop | favorites-toggle | 5 | 5 | 102 |
| desktop | rapid-search | 5 | 5 | 493 |
| desktop | gallery-open-close | 5 | 5 | 105 |
| desktop | form-modal-cycle-validation | 5 | 5 | 604 |
| desktop | form-modal-cycle | 15 | 15 | 61 |
| desktop | client-transition-catalog-to-project | 5 | 5 | 367 |
| desktop | offline-modal | 5 | 5 | 63 |
| mobile | favorites-toggle | 5 | 5 | 260 |
| mobile | rapid-search | 5 | 5 | 2091 |
| mobile | gallery-open-close | 5 | 5 | 232 |
| mobile | form-modal-cycle-validation | 5 | 5 | 658 |
| mobile | form-modal-cycle | 15 | 15 | 207 |
| mobile | client-transition-catalog-to-project | 5 | 5 | 1573 |
| mobile | offline-modal | 5 | 5 | 189 |


[interactions.json](artifacts/interactions.json); elapsed включает Playwright automation, ожидание route/data/CSS transitions; это не latency одного input event и не INP. Проверялись favorites, быстрый поиск, переход в карточку, gallery,20 modal cycles,5 invalid validations и5 offline modal повторов каждого профиля. Дополнительно [filter-repeats.json](artifacts/filter-repeats.json): technology checkbox, tech URL, nonempty matched group, снятие условия —5 повторов desktop/mobile. Доставка в CRM не вызывалась. Первый harness ошибался из-за implicit dialog selector, автоматического закрытия mobile search и сохранённого открытого mobile menu после закрытия dialog; эти попытки сохранены отдельно и не считаются дефектами продукта.

Legacy scenario ID client-transition-catalog-to-project в raw interactions оказался **полной document navigation**, а не SPA: sameDocument=false10/10, см.F17. Проверка функции перехода прошла, но его режим отдельно считается подтверждённой проблемой. Контрольная серия [client-link-navigation.json](artifacts/client-link-navigation.json) по10 кликам Next Link главная→каталог даёт sameDocument=true. Времена разных маршрутов нельзя считать прямым A/B ускорением.

После forced GC сохранены Runtime.getHeapUsage/Memory.getDOMCounters до/после20 dialog cycles. [local-home-after-modal-cycles.heapsnapshot](artifacts/local-home-after-modal-cycles.heapsnapshot) — desktop snapshot. Дополнительная серия [modal-memory-trend.json](artifacts/modal-memory-trend.json) после1/5/10/20/40/60 циклов: nodes1471 и listeners714 не растут, heap6.16→6.81MB с затухающим приростом. Начальный прирост listeners в первой серии сам по себе не доказал leak; после прогрева они стабильны. Один снимок/короткая сессия не подтверждает отсутствие утечки; detached DOM retainers/часовая сессия требуют отдельного анализа.

## Соответствие бюджетам

| Метрика | Цель проекта | Результат/статус |
| --- | --- | --- |
| TTFB | ≤400 мс; предпочтительно ≤200 мс | CONFIRMED: production главная/каталог нарушают 400 мс на обоих профилях |
| LCP | ≤1500 мс | CONFIRMED: production mobile 3180/4252 мс; desktop 896/1040 мс в controlled серии |
| FCP | ≤1800 мс | CONFIRMED: production mobile 3180/2904 мс; desktop 896/960 мс |
| CLS | ≤0.1 | PASSED в измеренных initial viewport; production max ниже 0.001 |
| Speed Index | ≤2.0 с | NOT VERIFIED: нет performance Lighthouse/filmstrip runner |
| INP | ≤200 мс, полевой p75 | NOT VERIFIED: нет RUM. Время Playwright-сценария и Event Timing не подменяют полевой INP |
| TBT | ≤200 мс | NOT VERIFIED: observed blocking сохранён, но это не окно Lighthouse TBT |
| Lighthouse Performance | ≥90/100 | NOT VERIFIED: доступный connector прямо исключает performance |
| HTTP 5xx | <0.1% | NOT VERIFIED для реального трафика. В 25 обычных curl GET получено 0 5xx; это не доказательство SLA |
| Критические JS ошибки | 0 | В controlled initial Chromium runs pageerror=0. Live SDK, Safari/Firefox и все состояния этим не покрыты |
| Регрессия | ≤10% от baseline | NOT VERIFIED: предыдущего сопоставимого baseline нет; текущая серия — первый снимок |
