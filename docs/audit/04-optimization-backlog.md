# Приоритизированный backlog

Аудит 28 октября 2026 года (Europe/Moscow). Снимок репозитория HEAD c544500b9a80946deb53829e5942053c1d78f5bc; незакоммиченные изменения перечислены в [git-status-before.txt](artifacts/git-status-before.txt). Аудит диагностический: исходники, зависимости, lockfiles, CMS, production-настройки и workflows не исправлялись.

Статусы: **CONFIRMED** — воспроизводимое измерение/наблюдение; **CODE-EVIDENCED** — механизм виден в коде, runtime-ущерб не измерен; **HYPOTHESIS** — требует проверки; **NOT VERIFIED** — не проверено; **PASSED** — выполненная проверка с ограниченным указанным охватом. PASSED не означает доказанного отсутствия любых проблем.

Ни одна задача ниже не реализована. S — локальная ограниченная работа; M — несколько связанных модулей/контрактов; L — сквозной сценарий или инфраструктура. Это относительная сложность, не обещание срока/процента ускорения.

## 1. Критические блокеры приёмки

Подтверждённых P0 нет. Полную performance-приёмку блокируют отсутствующие RUM/Lighthouse/SQL/host данные, а не предполагаемые стилистические проблемы.

| Задача | Основание | Сложность | Приёмка / зависимость |
| --- | --- | --- | --- |
| B01 Различать CMS unavailable и not-found | F05 P1 | M | На cold503 проект не выдаёт ложный404; есть явное недоступно/LKG и проверка восстановления |
| B02 Ввести revision, request spans и безопасные error counters | F11/F13 | M | Commit совпадает с deploy; visible upstream spans/timeout без токенов/PII |
| B03 Получить RUM p75 + полноценный Lighthouse runner | Ограничения проверки | M | Метрики воспроизводимы, tool/browser versions и thresholds сохранены |


## 2. Быстрые улучшения с потенциально высоким эффектом

| Задача | Основание | Сложность | Приёмка / риск |
| --- | --- | --- | --- |
| B04 Параллельные integration settings в layout | F03 P1 | M | Локальный delay250 timeline подтверждает параллельный старт, region/consent сохранены |
| B05 Компактный availability и лёгкая NotFound boundary | F03 P1 | M | Полный catalog не нужен только ради boolean; отдельно проверить скрытый not-found server graph и согласованный cache policy |
| B06 Responsive местные PageHero и крупные карточки | F06 P1 | M | Bytes снижаются при согласованном качестве/alpha/DPR; LCP не ухудшается |
| B07 Починить штатный lint | F12 P2 | S | Exit0 без выключения полезных правил глобально |
| B08 Заполнять APP_COMMIT | F13 P2 | S | Health/RUM/CI имеют один revision |
| B22 Проверить hard navigation карточек и переход на Link | F17 P1 | S–M | sameDocument в том же сценарии; Back/region/analytics/modified click сохранены |
| B23 WOFF2/subset для landing fonts | F16 P2 | S–M | Измерить реальные font bytes и кириллицу/оси; не менять фирменный вид |


## 3. Архитектурные оптимизации

| Задача | Основание | Сложность | Зависимости / приёмка |
| --- | --- | --- | --- |
| B09 Устранить последовательные фазы карточки | F04 P1 | M–L | После B02: hero, gallery, price, metadata, reactions сохраняют контракты |
| B10 Узкие DB выборки blocks и prices + Map индекса цен | F09 P1 code-evidenced | M | Сначала обезличенная БД/EXPLAIN; сравнить SQL count/rows/latency, access semantics |
| B11 Определить freshness SLA и targeted invalidation | F10 P2 | M | Не заменять все caches на no-store; A→B и outage checks обязательны |
| B12 Убрать общий media registry из обязательного client path | F07 P2 | M | После B06; анализ реально загружаемого chunk и тест всех URL |
| B13 Разделить page-specific CSS | F08 P2 | M | После визуальной матрицы; desktop/mobile/dialog/hover/print не регрессируют |


## 4. Инфраструктура

| Задача | Основание | Сложность | Условия |
| --- | --- | --- | --- |
| B14 Заполненные CPU/RAM/event-loop/upstream metrics | F11/F14 | M | Read-only host/container monitoring; без догадок о RAM/CPU |
| B15 Согласованное bounded load/recovery испытание | Непроверенная устойчивость | M | Изолированная CMS+DB+media, mock CRM/mail/CAPTCHA, пределы RPS/concurrency/времени согласованы |
| B16 Reservations/limits/replicas по измерениям | F14 P2 | M–L | После B14/B15; CMS media shared storage/worker leases/DB pool не нарушены |
| B17 Readiness/synthetic storefront checks рядом с liveness | F05 P1 | M | Health процесса остаётся простым; отдельно проверяется критический каталог |


## 5. Долгосрочный долг

Стандартизовать performance artifacts в CI и regression gates (B18); ввести короткий memory soak/heap retainer анализ (B19); определить lifecycle неиспользуемой module scene и82MB assets (B20, F15); обновлять зависимости отдельными проверяемыми миграциями (B21). npm outdated — список доступных версий, не доказательство ускорения или уязвимости. Крупные mortgage/hero компоненты разделять по обязанностям при дальнейших изменениях, не обещая скорость по уменьшению строк.

Рекомендуемая зависимость: B02/B08 → B01/B04/B05/B09 → B06 → B10/B11 → B12/B13 → B14/B15/B16. B07 и подготовка B03/B18 могут выполняться независимо. Продолжение оптимизации требует отдельного запроса пользователя; текущий аудит не изменяет код.
