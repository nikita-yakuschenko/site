# Последовательный план исправлений

Аудит 28 октября 2026 года (Europe/Moscow). Снимок репозитория HEAD c544500b9a80946deb53829e5942053c1d78f5bc; незакоммиченные изменения перечислены в [git-status-before.txt](artifacts/git-status-before.txt). Аудит диагностический: исходники, зависимости, lockfiles, CMS, production-настройки и workflows не исправлялись.

Статусы: **CONFIRMED** — воспроизводимое измерение/наблюдение; **CODE-EVIDENCED** — механизм виден в коде, runtime-ущерб не измерен; **HYPOTHESIS** — требует проверки; **NOT VERIFIED** — не проверено; **PASSED** — выполненная проверка с ограниченным указанным охватом. PASSED не означает доказанного отсутствия любых проблем.

Это план последующих отдельно разрешённых работ. Сроки не назначены: нет данных о составе команды, доступах и подтверждённой сложности SQL/infra. Ожидаемый результат описывает проверяемое изменение механизма, не обещает конкретного процента ускорения.

| Этап | Цель и компоненты | Ожидаемый результат | Зависимости | Риски | Критерий приёмки |
| --- | --- | --- | --- | --- | --- |
| 0. Надёжное измерение | Build metadata/health, request tracing, isolated benchmark, RUM/Lighthouse runner | Revision известен; causal latency/cache outcomes и недостающие метрики доступны | Read-only telemetry, поддерживаемый Node для CMS | PII leakage/measurement noise; ограничить поля и sampling | APP_COMMIT совпадает; baseline5runs/profile, no concurrent build; RUM sample size и p75 |
| 1. Правильная деградация | CmsCatalogProvider, project notFound, availability, readiness/synthetics | Upstream failure отделён от пустого списка/несуществующего slug; recovery наблюдаем | Этап0, freshness/fallback policy владельца | LKG цены могут устареть; не скрывать это пользователю | Cold/warm401/503/timeout не дают ложный404; восстановление корректно; liveness/readiness различены |
| 2. SSR critical path и навигация | RootLayout settings/catalog availability, NotFound boundary, ProjectPage groups/metadata, ProjectCard links | Независимые reads стартуют параллельно, несущественные секции не блокируют hero; внутренний card click сохраняет документ при допустимости SPA | Spans этап0, сохранённые contracts | Регионы/consent/preview/цены, порядок блоков, analytics lifecycle | Модель delay250 демонстрирует короткий путь; TTFB≤400ms; sameDocument card click и functional smoke |
| 3. Медиа и шрифты | PageHero, optimizedSrc, prebuild variants, factory fonts | Передаётся подходящий resolution/format при сохранении прозрачности/деталей | DPR/quality acceptance; сохранённые скриншоты | Потеря качества, лишние preload/дубли, неправильные crop | Visual QA DPR1/2/3, Network actual bytes/srcset, mobile LCP/FCP в бюджетах |
| 4. Общий CSS/JS | global stylesheet, webp manifest client import, route-level splitting | Меньше обязательных данных/правил на initial route | После медиа, coverage нескольких состояний | Скрытые визуальные состояния, print/mobile/модалы | Analyzer и actual transfer снизились; нет critical errors/CLS regression; бюджеты не ослаблены |
| 5. CMS/DB/cache policy | Blocks/prices queries, DTO/pagination, index review, invalidation | Стоимость связана с нужным scope, опубликованные данные имеют определённое SLA | Обезличенная БД/EXPLAIN и договорённость о stale | Access control, published-only, lost updates/cache stampede | SQL count/rows/latency до/после, realistic dataset; A→B/outage test; полная CMS unit/integration suite |
| 6. Устойчивость инфраструктуры | Host/container metrics, limits/reservations, replicas, worker/media topology | Ресурсы и recovery соответствуют реальной ёмкости | Отдельный стенд, нагрузочное разрешение, этап5 | OOM от слишком малого limit; scale CMS без shared media/worker ownership | Bounded load/spike/recovery с p95/p99/error rate, no unwanted external writes, корректный rollout/rollback |
| 7. Регрессии и уборка | CI budgets/RUM release monitor, lint, unused assets lifecycle | Performance regression замечается до/после релиза, нет ложных claims | Принятые baseline и gates | Шумный gate или автоматическое принятие плохого baseline | Контрольная регрессия>10% блокируется; задачи F12/F15 закрыты отдельными review; docs/artifacts актуальны |


## Переходы между этапами

Измерение и корректная деградация предшествуют агрессивному кешированию. Нельзя лечить F01 сохранением всего персонализированного HTML в shared CDN: регион, cookies, preview и attribution требуют корректных cache keys/границ. Нельзя лечить свежесть F10 массовым no-store: это увеличит F03/F09. Нельзя удалять CSS по одному viewport coverage, снижать качество фото до приемки или убирать analytics вопреки immediate-load требованиям.

Параллельные независимые задачи: lint/build revision, подготовка RUM runner и визуальная матрица. Каждое оптимизационное изменение — отдельный reviewable diff и сравнение с текущими raw measurements. После исправления повторять только затронутые сценарии, расширяя проверки при новых failures/рисках; не расходовать ресурсы на бессодержательные повторения.

## Условия завершения полной приёмки

Подтверждённые P1 исправлены или явно приняты владельцем как риск; все обязательные performance budgets проверены пригодным инструментом; real-user p75 доступен; известны production revision/ошибки/upstream latency; закончены безопасные SQL/load/soak проверки. До выполнения этих условий приложение не объявляется полностью оптимизированным или принятым по производительности.
