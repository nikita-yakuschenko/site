# AO-02 — канонические лайки и избранное: реализация

Дата: 21.10.2026. Реализован backend этап AO-02. Клиентское подключение выполнено следующим этапом и описано в [AO-03](ao-03-shared-heart-ui.md). Flags по умолчанию выключены. Production не изменялся, реальные голоса не переносились.

## 1. API публичного сайта

Все ответы — `Cache-Control: private, no-store`. Новые endpoints доступны только при обоих server flags `OPTIMIZATION_ENABLED=true` и `OPTIMIZATION_PREFERENCES_ENABLED=true`, одинаковом `OPTIMIZATION_PREFERENCES_SECRET` длиной >=32 на сайте/CMS и настроенном site API key. Секрет идентичности отделён от API key: обычная ротация ключа HTTP-доступа не должна создавать новых субъектов. Сам identity secret нельзя менять без отдельной совместимой миграции.

| Метод | Путь | Контракт |
|---|---|---|
| GET | `/api/projects/likes?codes=AB12CDEF,...` | До 100 кодов; возвращает состояние/счётчик/revision либо unavailable по каждому коду |
| GET | `/api/projects/likes/list?after=AB12CDEF` | До 50 понравившихся опубликованных проектов; next_cursor — следующий code либо null |
| PUT | `/api/projects/{code}/like` | `{liked, operation_id:UUID, expected_revision:integer, source:project_card\|project_actions\|legacy_api}` |
| POST | `/api/projects/likes/sync` | `{migration_id:UUID, legacy_ids:string[]}`; до 100 ID |

State: `{project_code, liked, likeCount, revision, reconciliation:ready|pending|required}`. Это не пользовательский аккаунт и не cross-device profile.

Mutations требуют same-origin Origin и действующего functional consent. Analytics consent дополнительно управляет записью server like/unlike events, но его отсутствие не мешает разрешённому functional состоянию. Rate limit в данном этапе — локальный для процесса, 60 запросов/минуту на первый forwarded IP, до 2048 buckets; это **не** глобальная квота нескольких реплик. Перед включением подтверждается, что proxy перезаписывает forwarded IP, а не доверяет произвольному значению клиента.

GET batch/list устанавливает подписанную HttpOnly session-cookie `avgst_preferences`, сохраняя существующий валидный `avgst_voter`. Legacy cookie остаётся совместимым идентификатором на 365 дней при functional consent. Canonical subject — namespaced HMAC старого voter id, в новых таблицах raw cookie/fingerprint не сохраняются. Подписанная cookie приоритетнее конкурирующего unsigned legacy значения.

Если новая mutation приходит до установления подписанной идентичности, она возвращает **428 identity_required и Set-Cookie без изменения БД**. AO-03 сначала делает GET batch, затем отправляет PUT; при 428 повторяет ту же operation_id после установки cookie. Это не bootstrap первоначальной рекомендательной выдачи: Proxy/SSR assignment относится к AO-04/05. Старый `/api/reactions` может принять уже существующий валидный legacy voter без подписанной cookie; совершенно первый запрос без идентичности тоже не изменяет счётчик до bootstrap.

## 2. Идемпотентность и конкурентные действия

- На сервере только set-state, никогда toggle.
- `(subject, operation_id)` уникальны, проверяется hash code/desired/revision/source. Повтор точного запроса возвращает сохранённый ответ, не новую mutation. Тот же UUID с другим телом — 409 operation_conflict.
- `expected_revision` защищает вкладки от stale intents; конфликт — 409 stale_revision с current. Для нового осмысленного намерения клиент использует новый UUID, а не меняет тело старого.
- Повторный ответ старой операции может содержать прежний revision/liked: AO-03 не должен применять его поверх более свежего revision в store. Replay не восстанавливает старое состояние в БД.
- Per-operation advisory lock и project row lock защищают receipt/count/preference/event в общей SQL transaction. Повтор одного desired состояния не создаёт event.
- No-op unlike создаёт tombstone состояния: последующий import старого localStorage его не воскрешает.

## 3. Исторические голоса

`project_like_baselines` фиксирует baseline count и evidence hash. Публичный count = `baseline_count + new_active_count - retired_legacy_count`. `project_likes` содержит состояние браузера, revision и contribution `new|legacy|pending`; claim исторического cookie уникален в `project_like_legacy_claims`. `project_like_operations` и `project_like_migration_batches` хранят идемпотентные ответы.

Точный существующий c-key получает один historic credit: импорт/повторный like не добавляет его к baseline второй раз; unlike списывает credit один раз, relike возвращает его. Плоский JSONB старых c:/f: ключей не трактуется как доказательство пары cookie↔fingerprint.

F-only совпадение и local-only import при ненулевом историческом baseline получают `pending`: preference сохраняется, public count не увеличивается на основании догадки. При доказанно нулевом baseline перенос локального избранного может увеличить новый public count, но не создаёт fresh analytic reward. Разрешение pending после изучения live evidence — отдельный шаг; автоматического выдуманного merge нет.

Sync разрешает code, `cms:<numeric id>`, однозначный slug/importKey. Несколько совпадений → ambiguous, draft → unavailable, unknown/referral → не проект. Email/произвольные поля в public sync contract не принимаются. Дубликаты алиасов одного проекта не удваивают count. Любая уже существующая canonical preference, включая false, при migration сохраняется.

Migration retry после partial `requires_baseline` может продолжиться без удвоения уже сохранённых состояний. Полностью завершённый batch запоминается; новое тело с тем же migration_id — 409. Маркер и удаление legacy localStorage реализуются в AO-03 только после серверного подтверждения.

## 4. Подготовка baseline

Команда CMS: `npm run optimization:likes:prepare` — только SELECT и агрегированный dry-run, без Payload onInit. `npm run optimization:likes:prepare -- --apply --version=<reconciliation-version>` — явный этап cutover после проверки live evidence/backup, при выключенных canonical writes. Сейчас --apply выполнялся **только на синтетической локальной БД в тестах**.

Подготовка всего набора атомарна; некорректный счётчик, дубли/повреждённые ключи или число c-голосов больше count откатывают все новые baselines. Повтор --apply не переписывает существующие baselines. Изменившийся legacy snapshot до первой canonical mutation возвращает baseline_changed, а не принимается молча. Продуктовая уверенность в полном историческом пересечении этим валидатором не подменяется.

Создание baseline передаёт ownership счётчика новой модели. Даже при выключении preferences старый endpoint **не возвращается к raw increment** для такого проекта. Legacy writer повторно проверяет ownership после project lock, поэтому запрос, начавшийся до cutover, не может прибавить старый голос после baseline capture. Уже подготовленный каталог нельзя считать обычным прежним режимом: rollout/rollback сохраняют compatibility adapter.

Новый PUT без baseline возвращает 409 reconciliation_required. Нет автоматического capture на GET/PUT, Payload startup или миграции. Перенос production остаётся отдельной эксплуатационной операцией.

## 5. Совместимость и редакторское сохранение

`/api/reactions` like/unlike при включённом модуле направляется в тот же canonical service; share/view механика не заменяется. Старый server endpoint тоже направляет like/unlike в canonical writer при переданном ownership. Legacy запрос без operation_id получает серверный UUID и set-state, поэтому повторы того же desired состояния не увеличивают count. Сильная защита от stale противоположного intent требует нового revision-aware API.

Projects beforeChange читает текущую canonical projection под Payload transaction/project lock, а не старые counts из исходной формы. Сохранение редактором даже переданного likeCount=999 не меняет авторитетную статистику. При create без id helper не выполняет запрос; на время старых миграций отсутствие новых таблиц не ломает create/update. Canonical edit без transaction отвергается, чтобы не допустить гонку.

Server like/unlike event создаётся только при реальном изменении, analytics permission и enabled events; в той же transaction, что state/count. Содержит operation_id/source и `reward_eligible:false`: пока нет AO-04/06 exposure attribution, этот факт нельзя выдавать за награду конкретной выдачи. Import вообще не создаёт такой event.

## 6. Проверки и границы

- Additive migration `20261021_130000_project_preferences`: пять таблиц, без backfill реальных голосов; runtime schema зарегистрирована в Payload через Drizzle hook.
- Unit/HTTP: schema/PII allowlist, signed identity tampering, Origin/consent/flags, bounded UTF-8 body, bootstrap 428, scoped server context, sanitization upstream response, server auth.
- PostgreSQL: up/down/up, schema columns/constraints/indexes, 12 simultaneous retries, stale revisions, legacy+favorite reconciliation, pending fingerprints, tombstones, alias ambiguity, unpublished records, event rollback, baseline/old-writer race, CLI dry-run/atomic preparation.
- Проверены настоящий Payload create/update/delete и сохранность count через hooks, а не только SQL mocks. В CI тесты используют отдельные disposable databases.
- Полная цепочка миграций и штатный schema-drift проверены на новой локальной PG17.4; CI использует PG18.6. Проверки не являются production go/no-go.

Не входит в AO-02: переключение UI на shared store, автоматическая миграция browser favorites, Proxy ranking identity, Server Action региона, visibility observer и подбор рекомендаций. Новые endpoints и compatibility backend готовы к AO-03, но флаги не включались.
