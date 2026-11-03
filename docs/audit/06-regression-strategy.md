# Стратегия предотвращения регрессий

Аудит 28 октября 2026 года (Europe/Moscow). Снимок репозитория HEAD c544500b9a80946deb53829e5942053c1d78f5bc; незакоммиченные изменения перечислены в [git-status-before.txt](artifacts/git-status-before.txt). Аудит диагностический: исходники, зависимости, lockfiles, CMS, production-настройки и workflows не исправлялись.

Статусы: **CONFIRMED** — воспроизводимое измерение/наблюдение; **CODE-EVIDENCED** — механизм виден в коде, runtime-ущерб не измерен; **HYPOTHESIS** — требует проверки; **NOT VERIFIED** — не проверено; **PASSED** — выполненная проверка с ограниченным указанным охватом. PASSED не означает доказанного отсутствия любых проблем.

## Неизменяемые бюджеты проекта

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


Эти значения не ослабляются из-за текущих нарушений. Внедрять gates нужно с явным списком известных нарушений и планом их закрытия, чтобы baseline не превратился в новое, более слабое требование.

## Минимальный комплект CI

1. Сохранить существующие browser quality/CMS unit/build проверки. Добавить корневой lint после F12, revision check и проверку известного synthetic fixture marker, чтобы случайно не тестировать пустой каталог.
2. После production build на выделенном runner: пять холодных navigation runs desktop/mobile для /, /catalog, одного проекта, /manufacture, /mortgage, /stories, /factory-open-day. Фиксировать CPU/network/browser/tool versions, dataset и server warm/cold отдельно. Запускать последовательно без build jobs на той же машине.
3. Полноценный Lighthouse navigation runner сохраняет JSON+HTML+trace/filmstrip. Performance≥90, LCP/FCP/SI/TBT/CLS в указанных бюджетах. Нельзя использовать connector без performance для этого gate.
4. TTFB/API checks: local/mock измеряют regression и dependency fan-out, staging с realistic CMS — latency. Budget≤400ms для page TTFB; p95/p99 API требуют собственного достаточного sample size/SLO, который сначала согласовывается, а не выдумывается по5 запросам.
5. Bundle gate: сохранять Next analyzer export и actual route-loaded JS/CSS compressed bytes. Блокировать >10% роста относительно принятого baseline того же маршрута/профиля. Абсолютный JS/CSS budget в пользовательском задании не установлен: **не вводить произвольные 100KB/200KB как обязательный норматив**; первоначально зафиксировать current byte baseline и согласовать целевой cap после оптимизаций.
6. Браузерные interactions: favorites, быстрый search/filter, client navigation, gallery, invalid form/CAPTCHA failure, offline modal,20cycles heap smoke. Synthetic elapsed не выдавать за INP; event long tasks использовать как diagnostic alert.
7. Resilience gate: mock CMS503/timeout/401 на cold/warm cache, A→B публикация и revalidation, health/readiness semantics. Не допускать false404/empty200 при upstream failure после отдельного согласованного исправления F05.

## Правила блокировки релиза

Блокировать production build/typecheck/unit/smoke failure; новые critical pageerror/hydration failures первого-party; потерю критического каталога/формы; подтверждённое нарушение принятого hard performance budget; деградацию>10% против сопоставимого baseline. Для шумных лабораторных изменений повторять **только** спорную серию на чистом runner и сохранять обе серии, не выбирать лучший прогон.

Known failing budgets требуют временного видимого исключения с issue/владельцем/условием удаления, если команда всё же решит выпускать функциональный релиз. Это governance recommendation, не разрешение считать бюджет пройденным. Нельзя автоматически обновлять baseline до ухудшившегося значения.

## RUM и серверные наблюдения

Собирать final LCP/CLS/INP по route template, device class, release/build ID и region category; считать p75 на реальных пользовательских visits с sample count/window. Не собирать поля форм, телефоны, URL query с attribution/PII или raw cookies. Long tasks, TTFB, resource breakdown — вспомогательные диагностические поля с ограниченным sampling. RUM проверять canary visit и агрегированным отчётом; Metrica presence не заменяет CWV instrumentation.

Server traces: request correlation ID→proxy registry→root settings/content/availability→page data groups→CMS SQL. Метрики upstream latency, timeout/status/error count/cache outcome, pool saturation, Node event-loop delay/RSS/GC. Не писать API keys, Authorization, cookies, lead bodies и database URL. Для CMS цены/контента фиксировать version/update marker без самих персональных данных.

## После публикации

Обычные read-only synthetic visits /,/catalog/known project + health/revision + CMS ready, без заявок/записей. Сверить expected commit, наличие реальных карточек/hero и main JS errors. Сравнить lab canary с baseline того же geographic runner; затем наблюдать RUM p75/error rate/API latency с достаточным объёмом данных.

HTTP5xx<0.1% проверять по реальному знаменателю requests/visits и достаточному окну; sample25/0errors не годится. Новая утрата каталога, ложный404, critical JS errors, стабильно нарушенный SLO после deploy требуют реакции владельца/rollback по заранее согласованной политике. Dokploy frontend rollback/start-first есть; успешность rollback и совместимость CMS schemas не проверены.

## Безопасное нагрузочное испытание

Только изолированная frontend+CMS+Postgres+media копия, внешние CRM/email/analytics/CAPTCHA заменены mock. Перед запуском согласовать baseline traffic mix, предел RPS/concurrency/time/CPU/RAM и stop conditions. Сначала одиночные requests/warmup, затем ступени конкурентности, plateau, короткий ограниченный spike и recovery; фиксировать p50/p95/p99, error rate, event-loop, RSS/heap/GC, pool wait, CPU/IO/cache hits. Найти knee по измерениям, не назначать произвольную нагрузку действующему сайту. Отдельно cold-cache/failing CMS и slow upstream. Сейчас этот план не исполнен.
