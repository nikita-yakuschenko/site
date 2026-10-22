# Продолжение AO на другом компьютере

Сохранено 22.10.2026. Ветка: `codex/adaptive-optimization`. Это WIP для продолжения разработки, **не готовый production release**. Ветка не должна автоматически сливаться в main или включать оптимизацию.

## Как получить

В существующей чистой копии репозитория:

```powershell
git fetch origin
git switch --track origin/codex/adaptive-optimization
npm ci
npm --prefix cms ci
npx next typegen
```

Если локальная ветка уже есть: `git switch codex/adaptive-optimization`, затем `git pull --ff-only`. Для нового checkout можно сразу `git clone --branch codex/adaptive-optimization https://github.com/nikita-yakuschenko/site.git`.

Рекомендуется Node.js 22.13+ согласно CMS engines; миграции/интеграции требуют локальную одноразовую PostgreSQL. `.env.example` и `cms/.env.example` содержат только шаблоны. Реальные `.env`, API keys, DB dumps, CMS uploads и node_modules через Git не передаются. Текущие production credentials не нужны для pure/unit разработки. При необходимости общей зависимости zod воспроизвести существующий шаг установки из `.github/workflows/cms-image.yml`; не копировать локальный node_modules с предыдущего компьютера.

## Что сохранено

- AO-01: contracts, registered custom schema, additive migration, registry/readiness, persistence primitive, флаги и tests.
- AO-02: canonical set-state/CAS/idempotency, baseline CLI, legacy compatibility/import, endpoints, защита редакторского счётчика и integration tests.
- AO-03: shared heart store/provider, карточки/страница/каталог, batch/list/import, cross-tab invalidation, consent cleanup, browser tests.
- AO-04: незавершённые Proxy/context signatures, decision persistence/eligibility, event ingress и тесты. В исходниках оставлена условная диагностика `AO_TEST_DECISION_DEBUG`; не считать этот этап завершённым.
- RFC, discovery, Implementation Plan, AO-02/AO-03 contracts и утверждённая спецификация LKG. Desktop-копия RFC на другом компьютере не нужна: канонический документ теперь в репозитории.

## Известное незавершённое

1. **AO-04 integration не принят.** `cms/tests/integration/optimization-events.test.ts` не завершался успешно: отмена дочернего concurrent-assignment теста, затем FK error при cleanup. Причина не установлена. Сначала воспроизвести исходную ошибку, дождаться завершения всех concurrent операций и проверить транзакционность/cleanup; не объявлять решение по предположению и не скрывать assertions.
2. Новая политика **LKG обязательна**. Текущие `hidden`/authority-failure контракты черновика AO-04 ещё не согласованы с ней. Нельзя скрывать популярные при CMS/PG outage. AO-04 готовит delivery/source boundary; AO-05A–C реализует независимые JSON+media packs, previous/bootstrap, SSR adapter и регион; AO-10 доказывает storage/recreate/failover. Это пока документация, не готовая реализация.
3. Ни production mounts/topology, ни реальные редакционные LKG NN/MSK/media не подтверждены. Нет данных для обещания гарантированной шестёрки без preflight.
4. Не включать flags, не выполнять production migrations/deploy. Не откатывать canonical writer AO-02 на старый raw increment.

## Проверки и команды

При сохранении checkpoint 22.10.2026 повторно прошли TypeScript сайта и CMS и **128/128 CMS unit tests**. Это не включает integration suite: известная проблема AO-04 остаётся открытой. Ветка объединена со свежим origin/main со скриптом One2Click; незавершённые AO изменения в main не отправлялись.

Исторические результаты AO-03: 125 CMS tests, 5 Chromium tests и typecheck обоих приложений проходили **до незавершённой AO-04**. Не переносить эти цифры на текущий WIP без нового прогона.

Дополнительная проверка возврата нового посетителя AO-02/03 прошла через настоящий Payload REST и одноразовую PostgreSQL: Chromium закрыт и запущен снова только с persistent cookies, без localStorage; server like/favorite восстановился, одна canonical row/count=1, replay не увеличил счётчик, import не понадобился. `avgst_voter` — 16 random bytes, HttpOnly cookie, 365 дней с обновлением API; signed `avgst_preferences` сессионная и восстанавливается на том же voter. Четыре дня моделировались проверкой expiry и удалением session cookies, без календарного ожидания. Код идентификации менять не понадобилось.

Базовые проверки:

```powershell
npm run typecheck
npm --prefix cms run typecheck
npm --prefix cms test
npx playwright install chromium
npm run test:e2e:preferences
```

Integration tests используют только явно заданные loopback disposable DB URLs и проверяют допустимое имя БД. Они не должны брать production DATABASE_URL. Фундамент/likes fixtures требуют пустые отдельные БД; Payload/return/events — предварительно мигрированную disposable БД. Пример имён: ao_test_optimization, ao_test_likes, ao_test_release.

```powershell
# Из каталога cms, после подготовки тестовых БД и временного local environment:
node node_modules/tsx/dist/cli.mjs --test --test-force-exit tests/integration/optimization-foundation.test.ts tests/integration/optimization-likes.test.ts
node node_modules/tsx/dist/cli.mjs --test --test-force-exit tests/integration/optimization-payload-edit.test.ts
node node_modules/tsx/dist/cli.mjs --test --test-force-exit tests/integration/optimization-events.test.ts
node node_modules/tsx/dist/cli.mjs --test --test-force-exit browser-tests/optimization-browser-return.test.ts browser-tests/optimization-proxy.test.ts
```

Соответствующие переменные: OPTIMIZATION_TEST_DATABASE_URL, OPTIMIZATION_LIKES_TEST_DATABASE_URL, OPTIMIZATION_PAYLOAD_TEST_DATABASE_URL, OPTIMIZATION_EVENTS_TEST_DATABASE_URL, OPTIMIZATION_RETURN_TEST_DATABASE_URL. Точные allowlists имён/host проверяются в каждом тесте; не обходить ограничения. Локальные flags тест выставляет только в своём процессе, рабочие конфигурации остаются false. Временный кластер предыдущего компьютера остановлен и не переносится.

## С чего продолжить

Прочитать [Implementation Plan](adaptive-optimization-implementation-plan.md), особенно §§19–20, и [LKG](adaptive-optimization-lkg.md). Затем закончить/проверить AO-04 с учётом новой политики. Сердца и миграция не требуют перепроектирования. Не начинать Bayesian/model этап вместо устранения текущих integration failures.

Скрипт One2Click уже опубликован отдельно в main коммитом `4eb2132`; не отправлять весь этот WIP в production ради его установки. В AO-ветке его вставка должна сохраняться.

В checkpoint не включаются временные `.next-inline-check`, preview HTML, factory/open-day документы, локальные Cursor rules, generated site-index/payload-types изменения и прочие посторонние файлы. Они не нужны для AO и остаются на прежнем компьютере. Изменения общего layout и соответствующих UI/API файлов сохранены в рабочем виде.
