# AO-001 — Implementation Plan

Дата: 21.10.2026. Основание: переданный пользователем `C:/Users/Nikita/Desktop/adaptive-optimization-architecture-rfc.md` и локальный discovery. Рабочая база: `D:/site`, `main`, HEAD `642cfa3`, с существовавшими локальными изменениями. Production/staging, live schema и данные посетителей не проверены. Разделы 1–15 описывают план; фактический прогресс последующей реализации и проверки указан в §16. Наличие API в плане не означает, что endpoint уже работает.

## 1. Объём и последовательность

Следуем следующему артефакту RFC §20: file-by-file план, схема хранения, API, тесты, миграционная последовательность и release gates. Не трактуем текст `[РЕШЕНО]` в RFC как доказательство существующего кода. Не переносим ограничения первого аудита на будущую разработку: запрет функциональных изменений относился к аудиту; текущая итерация намеренно ограничена следующим документированным этапом RFC.

Первый продуктовый выпуск объединяет единое сердечко, корректные события и cold-start выдачу. Bayesian phase идёт отдельным изменением после проверки наблюдений. Никаких искусственных фото/CTA вариантов, ML service или новых UI experiments в v1. `/sampling` и legacy form IDs сохраняются.

Default policy: hybrid, максимум шесть уникальных eligible проектов, pins на заданных позициях, random exploration свободных слотов при первом разрешённом включении. Начальный баланс interest/business — 50/50 после фиксации обеих нормировок; до их проверки — cold-start, а не фиктивно обученный score.

## 2. Этап 0: локально перепроверенные факты

| Проверка | Факт текущего кода | Следствие |
|---|---|---|
| Состояние checkout | HEAD 642cfa3; до работы уже изменены layout/page/share/site-index, есть untracked документы | Не коммитить/откатывать посторонние изменения; implementation PR формировать отдельно по проверенному diff |
| Идентичность | code — 8 символов, 6 букв и 2 цифры; numeric id — PK; DTO cmsId = code | Публичный project_code валидировать `isRecordId`; resolve строго по code, не по похожему slug |
| SSR регион | Proxy передаёт x-avgst-region; root layout и RegionBootstrap его используют | Один server resolver региона для decision и цены |
| Смена региона | RegionSwitch.select только writeRegionCode + close, refresh отсутствует | Добавить согласованное обновление server decision, временно не логировать старую выдачу в новом регионе |
| Цена | catalogPrice использует NN standard/configuration/base; DTO regionalPrices содержит nn/msk, nn дополняется fallback | Решение берёт тот же публичный resolver; запретить перенос NN цены в MSK |
| Eligibility DTO | CatalogProject не несёт явный recordType/_status; DTO published фильтрует CMS endpoint | Внутри CMS читать исходные записи, не выводить recordType из косвенного readyHome |
| Popular slots | CMS href содержит code; код выбирает parts в порядке массива; seed keys 0..5 | Для миграции ordinal = N+1; строго 0..5; конфликты не разрешать молча |
| Legacy likes | like_voters — плоский JSON массив c:/f: ключей, без записи пары или времени | Из JSON нельзя восстановить доказанные пары cookie↔fingerprint; запрещён массовый cross-device merge |
| Карточное сердце | favorites localStorage, без server like | Новый state store и совместимая browser migration |
| Lead boundary | request_id varchar UNIQUE; intake сохраняет receipt, затем after delivery | Receipt — авторитетный источник conversion, аналитика не должна менять успех формы |
| Form names | FactoryOpenDayForm — точный фактический ID; RFC в одном месте пишет factory-open-day | Реестр использует FactoryOpenDayForm; не переименовывать существующий ID |
| Mobile hero | ProjectHeroContent вызывает header-question, как SiteChrome; отдельного source_component нет | Явно разнести project.hero.question и site.header.question |
| Payload schema | postgresAdapter поддерживает beforeSchemaInit/afterSchemaInit; schema-drift считает неизвестные SQL-таблицы расхождением, кроме отдельных исключений | Регистрировать custom schema; не отключать drift глобально и не игнорировать все optimization_* |
| Фоновое выполнение | after есть для delivery; scheduled model worker не найден | Новый отдельный CLI job и проверенный внешний scheduler позднее |

Источники: `src/lib/record-id.ts`; `src/lib/regions.ts`; `src/lib/region-traffic.ts`; `src/proxy.ts`; `src/components/region-bootstrap.tsx`; `src/components/region-switch.tsx`; `cms/src/config/catalog-price.ts`; `cms/src/collections/project-catalog-endpoint.ts`; `src/lib/catalog/types.ts`; `src/lib/popular-content.ts`; `cms/src/seed/standard-site.ts`; `cms/src/collections/project-reactions-endpoint.ts`; `cms/src/config/lead-intake.ts`; `cms/src/config/lead-title.ts`; `src/components/project-hero-content.tsx`; `cms/scripts/check-schema-drift.ts`; `cms/node_modules/@payloadcms/db-postgres/dist/types.d.ts`.

### Непроверенное извне

Production revision, live schema, applied migrations, объём published проектов по регионам, содержимое слотов, распределение legacy ключей/счётчиков, topology/mounts/scheduler/CDN, кабинетные настройки аналитики. Эти проверки не объявляются завершёнными. Не импортировать Payload config для «безопасного чтения» без отдельного review: onInit содержит возможные seed/update операции.

Read-only evidence перед применением миграций: revisions сайта/CMS; список миграций и схема relevant columns/indexes; counts eligible/ineligible с reason по регионам; slots code/position; агрегированная сверка JSON keys/counts, без экспорта PII/секретов. Backup и restore drill — перед migration cutover. Доступ и способ получения этих сведений пока не определены.

## 3. Решения, подтверждённые пользователем после RFC

Действующие продуктовые решения: первое SSR-назначение через Proxy без клиентского bootstrap; смена региона через Server Action с согласованным серверным деревом; независимый региональный Last Known Good при отказе CMS/PostgreSQL. Прежнее решение о скрытии блока отменено последним указанием владельца продукта. Полная спецификация — [LKG](adaptive-optimization-lkg.md). Наличие документов не означает, что все механизмы уже реализованы; фактический статус этапов приведён ниже.

### 3.1. SSR и стабильная идентичность

Server Component может читать cookies, но не устанавливать их при render. Решение не должно опираться на `.set()` в HomePage. Локальная Next документация: `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cookies.md`, `.../03-file-conventions/proxy.md`, `.../01-getting-started/15-route-handlers.md`.

План: Proxy **без запросов ranking/БД** создаёт допустимый signed opaque browser context/session seed до render, устанавливает response cookie и передаёт проверенные значения через перезаписанные внутренние request headers. Любые одноимённые входные headers клиента отбрасываются. HomePage берёт этот контекст и запрашивает CMS decision; CMS использует ключ `(subject/session, region, assignment_scope)` и row/advisory lock. Decision id хранится в PG; необязательно устанавливать отдельную decision cookie из страницы. Повторное SSR на том же scope возвращает существующее решение после eligibility/config recheck.

Технический browser cookie создаётся/проверяется до обращения к CMS: отказ CMS не отменяет HTTP Set-Cookie. Значение случайное, подписанное, без PII; invalid signature обрабатывается как отсутствие. Первый HTML уже содержит выбранные сервером карточки, отдельного client fetch ради первоначального назначения и hydration replacement нет. Идентичность в response cookie и internal request header данного ответа должна совпадать. Проверять это и при timeout decision API.

Граница concurrency: два совершенно первых запроса без cookie могут законно создать разные случайные идентификаторы — Proxy не может узнать, что это один браузер, без уже общего ключа. Нельзя обещать их дедупликацию с помощью process Map, IP или fingerprint. Тесты фиксируют self-consistency каждого ответа, отсутствие смешивания SSR/decision owners и сходимость последующих запросов к cookie, сохранённому браузером; события раннего ответа проверяются по подписанному decision context, а при несовместимости владельца не переатрибутируются другому субъекту. Для одновременных запросов с одним существующим cookie PG lock обеспечивает одно активное назначение. Неиспользованные первые назначения не считаются показами и очищаются по retention.

Prefetch не создаёт ranking_assigned/exposure. Для prefetch без действующего контекста — безопасная preview/fallback выдача без записи назначения; фактическая навигация должна получать актуальный dynamic response. До активирования проверить Router Cache и back/forward; не считать это решённым одной директивой no-store.

Базовый технический browser cookie для принятой механики назначения — сессионный; долгосрочное persistence и analytics ingestion не включаются самим фактом его наличия. Продление срока идентичности и обучение следуют отдельно заданным functional/analytics настройкам; не обещать 24-часовую стабильность после закрытия session cookie. При выключенном модуле новые optimization cookies не создаются. Отзыв HttpOnly cookie выполняется серверным endpoint, не document.cookie cleanup. Этот документ не делает правовых выводов о категории cookie.

### 3.2. Регион

Server resolver отдаёт `{region, region_source, revision}`; root/page/decision используют одно подтверждённое значение. Существующий RegionSwitch вызывает NEW `src/app/actions/region.ts` (`setRegion` Server Action), которая валидирует nn/msk, записывает регион в server response cookie и обновляет серверное дерево. Не выполнять прежний optimistic writeRegionCode перед успешным action: иначе цены изменятся раньше состава. Pending UI показывает процесс выбора, а подтверждённый регион/цены/решение остаются согласованным снимком. После server commit новая региональная выдача и цены переключаются вместе, observer начинает новый scope. Ошибка action сохраняет прежний снимок, доступен повтор.

В текущем Proxy x-avgst-region вычисляется до Server Action. Во время action cookie меняется уже после Proxy: resolver в повторном server render не должен слепо предпочитать старый заголовок новому cookie. План: action явно revalidate/update нужного server tree, resolver проверяет новую cookie/revision в action render, а Proxy для следующего запроса вновь формирует согласованный заголовок. Это обязательный integration test, а не предположение о framework. При необходимости отдельного router.refresh после action он выполняется после cookie commit, без дублирующих запросов при уже обновлённом дереве.

`router.refresh()` обновляет Router Cache/server tree, но сам по себе не сбрасывает Data Cache каталога. В штатном режиме eligibility и публикация перепроверяются свежим authoritative CMS read (`cache:no-store`) перед отдачей нового или sticky решения; общий 60-секундный catalog fetch не считается проверкой публикации. При отказе источников используется отдельный региональный LKG с последней проверенной ценой и разрешённой устарелостью; для его SSR чтение CMS не требуется. Передать SSR нужные поля/DTO из того же validated snapshot, чтобы не наложить старую цену на новую выдачу. Инвалидация shared content/catalog при publish — отдельный механизм, не побочный эффект выбора региона.

Однократная миграция `avgst:region`: browser-only localStorage читается после hydration, если нет подтверждённого серверного выбора. Валидный nn/msk отправляется той же Server Action, cookie/дерево подтверждаются, затем ставится migration marker. Явный новый выбор пользователя и действующий серверный выбор имеют приоритет над legacy storage; при неизвестном происхождении default cookie Proxy передаёт source, а не объявляет default явным выбором. Marker — только после успеха, retry идемпотентен, отсутствие storage допустимо. Не затирать legacy выбор до подтверждения; поздний ответ migration action не может откатить более новый ручной выбор. На первом SSR legacy localStorage недоступен, поэтому допустимо одно согласованное обновление региона после миграции; это не client bootstrap первоначального ranking assignment.

### 3.3. Fallback и недоступность CMS

Утверждён приоритет доступности блока: **независимый Last Known Good**, включая JSON и копии изображений. Устарелость публикационного статуса и цены в аварийном режиме допускается осознанно. Запрет LKG и автоматическое скрытие блока отменены.

| Состояние | Выдача | Обучение |
|---|---|---|
| Всё доступно | Адаптивная шестёрка текущего режима с актуальной eligibility | По валидному контексту |
| Алгоритм/decision service недоступен | Последний корректный LKG либо проверенная региональная редакционная шестёрка | Аварийное происхождение отдельно от Thompson |
| Статистика/collector недоступны | Карточки остаются, остальные доступные функции продолжают работать | Временно приостановлено; delivery событий не блокирует UI |
| CMS недоступна/публикацию сейчас проверить нельзя | Сохранённый LKG нужного региона с независимыми изображениями | fallback_lkg, без fake assignment/propensity |
| PostgreSQL недоступен, включая одновременный отказ CMS | LKG из site-owned persistent store либо bootstrap образа, без PG/CMS reads | Никаких выдуманных наблюдений/negative outcomes |
| Источники восстановлены | Актуальная проверка → normal выдача; publisher обновляет общий LKG | Исторический аварийный трафик не подмешивается в обучение |

Site-level результат: ready с source=adaptive/fallback_checked либо ready с source=fallback_lkg, snapshot id/version/checksum/validated_at и training_eligible=false; в обеих ветках полные DTO шести карточек. Отказ authority — внутренний typed error для выбора LKG, не public hidden/[] и не induced 500. Shortfall остаётся диагностикой selector-а, а renderer берёт полный резерв, не публикует неполный pack.

Хранилище: versioned JSON+content-addressed media на независимом persistent mount публичного сайта, current/previous с атомарным pointer и fallback к подготовленному NN/MSK bootstrap внутри образа. Наличие mount/topology ещё не подтверждено; host-local bind не выдаётся за multi-node storage. Нет нового обязательного Redis/S3. Нужны единый publisher, generation CAS, проверка целостности/файлов и rollback pack. SSR не вызывает CMS для ремаппинга codes LKG или загрузки его изображений.

До активации обязательны полные NN/MSK наборы и media, preflight/recreate/multi-replica proof, независимая аварийная замена/исключение с запасными карточками. Возраст snapshot вызывает alert, но не его удаление или скрытие. Переключение региона использует pack того же региона и сохраняет контракт Server Action. Подробности, поля, процедура и 14 тестовых сценариев — [LKG §3–12](adaptive-optimization-lkg.md).

### 3.4. Неопределённые числа

TTL 24 часа и visibility 50%/1 sec — предлагаемые versioned defaults RFC, не статистические/правовые константы. Observation windows, метрики нормировки E/B, повторные обращения, retention, holdout rate и freshness thresholds должны получить явные версии до их включения. Нельзя подставлять произвольные коэффициенты и называть их утверждёнными. Cold-start не зависит от готовности этих весов.

## 4. Границы модулей и PR

Все пути в таблицах — от `D:/site`. Новые пути обозначены `NEW`; это план, не наличие файлов.
Подробный список добавляемых LKG reader/publisher/media/bootstrap/deployment файлов и разделение AO-05A–C — [LKG §10](adaptive-optimization-lkg.md). Эта зависимость обязательна до переключения главной на новый resolver.

| PR | Новые/изменяемые исходники | Результат и зависимость |
|---|---|---|
| AO-01 Contracts/schema harness | NEW `src/lib/optimization/contracts.ts`, `placements.ts`; NEW `cms/src/optimization/schema.ts`, `repository.ts`; `cms/src/payload.config.ts`; migration registry/required-migrations | Общие types/validation, custom tables видны schema-drift; flag off. Никакой подмены UI |
| AO-02 Canonical likes | NEW `cms/src/optimization/likes.ts`, `legacy-likes.ts`, `likes-endpoints.ts`; NEW public `src/app/api/projects/[code]/like/route.ts`, `likes/route.ts`, `likes/sync/route.ts`; `src/lib/reactions.ts`, legacy reaction endpoint | Set-state/idempotency/CAS, baseline reconciliation, совместимый old API. Требует live reconciliation evidence перед cutover |
| AO-03 Shared heart UI | NEW `src/components/project-preferences-provider.tsx`; NEW `src/lib/project-preferences.ts`; `project-card.tsx`, `project-actions.tsx`, `favorites.ts`, `catalog-board.tsx`, root layout | Один optimistic store, batch hydration, browser import. AO-02; вместе с совместимым backend |
| AO-04 Event/decision persistence | NEW `cms/src/optimization/{events,decisions,eligibility,endpoints}.ts`; NEW `src/lib/optimization/{server-context,server-client}.ts`; NEW `src/app/api/optimization/events/route.ts`; `src/proxy.ts` | PG dedup, SSR identity boundary, event allowlist, no-store; delivery source boundary normal/LKG, authority failure отдельно от public render; flag off. Текущие наработки не откатывать |
| AO-05 Cold-start selector | NEW `cms/src/optimization/{select,policy,random}.ts`; NEW `src/app/actions/region.ts`; `src/lib/popular-content.ts`, `src/app/page.tsx`, `src/components/popular-projects.tsx`, `block-renderer.tsx`, `region-switch.tsx`, `region-bootstrap.tsx`, `src/lib/regions.ts` | Hybrid/manual/automatic, pins, normal fresh eligibility; AO-05A independent regional pack/publisher/media/bootstrap/preflight, AO-05B SSR LKG и Server Action региона, AO-05C mount/container delivery. Полная шестёрка при инфраструктурном отказе. Зависит AO-04 contracts; pack подготовлен до activation |
| AO-06 Exposures and navigation | NEW `src/components/optimization/project-exposure.tsx`; NEW `src/lib/optimization/{client-queue,navigation-context}.ts`; `project-card.tsx`, `project-actions.tsx`, `share.ts`, project page | Actual visibility + click/open chain; bounded queue, share method; no legacy fabricated rewards |
| AO-07 Forms/receipt attribution | NEW `src/lib/optimization/form-context.ts`; NEW `cms/src/optimization/{lead-attribution,receipt-reader}.ts`; `project-lead-context.tsx`, `lead-dialog.tsx`, `lead-reveal.tsx`, `panel-lead-form.tsx`, `lead-form.tsx`, all concrete callers; `leads.ts`, Next leads, CMS intake | Explicit opening source, separate attribution, server-only lead facts. Не менять Roistat transport |
| AO-08 Admin policy/diagnostics | NEW `cms/src/collections/OptimizationSettings.ts`; NEW `cms/src/components/admin/optimization/*`; `StructureView.tsx`, `payload.config.ts` | /sampling обзор, slots, regions, diagnostics, immutable config revisions, kill switch |
| AO-09 Model job | NEW `cms/src/optimization/{aggregate,model,posterior,snapshots}.ts`; NEW `cms/scripts/optimization-rebuild.ts`; CMS package scripts; tests | Idempotent matured-window rebuild, snapshot publish, pooled priors, no SSR training |
| AO-10 Evaluation/staging release | `cms/tests/*`, `cms/tests/integration/*`, `e2e/*`; deployment docs/workflow только после topology evidence | A/A, CMS+PG failure, cold media, persistent restart/recreate, corrupted current→previous/bootstrap, NN/MSK, recovery, multi-replica/cache/CLS и no-training-LKG; synthetic staging, go/no-go. Не автоматический production rollout |

AO-02/03 и AO-04/05 проектируются по общей схеме AO-01, но не выкатываются несовместимыми версиями. UI experiments остаются будущим RFC addendum. Никаких таблиц experiments/variants без потребителя.

## 5. Хранение и ownership

Настройки/permissions — Payload-managed; event log/decision/likes/model tables — registered custom Drizzle schema + явные SQL migrations. Custom schema должна участвовать в `payload.db.schema` и drift; отсутствие её в runtime — blocker AO-01. Не добавлять широкие exclusions в drift checker. Использовать installed adapter schema hooks, а точный integration proof выполнить на disposable DB в AO-01. Если hook не покрывает реальные таблицы/constraints, вернуться к явному owned-schema diff, не игнорировать расхождения.

### 5.1. Таблицы и ключи

| Таблица | Основные столбцы | Constraints/индексы |
|---|---|---|
| optimization_settings (Payload Global) | enabled, mode, phase, active_config_version, kill_switch | ACL; update через проверенный endpoint, CAS expected_revision |
| optimization_config_versions | version uuid, created_at, actor_id, config jsonb, content_hash | Immutable; active pointer атомарно; config содержит pins/exclusions/windows/normalization/retention/cohort rules |
| optimization_assignment_heads | subject_key, region, scope, current_decision_id, revision | PK(subject_key,region,scope); serializes simultaneous assignments; scope includes session policy |
| optimization_decisions | id uuid, subject_key nullable, session_key nullable, region, mode, cohort, config/policy/model/visibility versions, candidate_set_hash, candidate_snapshot jsonb, assigned_at, expires_at, invalidated_at | PK; check expiry; FK config/model; subject/region/expiry index. No raw browser cookie |
| optimization_decision_items | decision_id, project_id integer, project_code, slot_position, origin, sampling_trace jsonb | UNIQUE(decision_id,position), UNIQUE(decision_id,project_id), CHECK 1..6; FK projects, code snapshot |
| optimization_exposures | id uuid, decision_id, project_id, position, scope_key, region, visible_at, received_at, visibility_rule_version | Composite FK на exact decision item; UNIQUE(decision_id,project_id,position,scope_key); exposure ID stable per scope |
| optimization_events | event_id uuid, payload_hash, type, occurred_at, received_at, project_id/code nullable, decision/exposure/session/subject nullable, region, placement, component, position, schema_version, payload jsonb | PK(event_id); conflict same hash → duplicate, different hash → rejected; time/type, project/time, decision/time, subject/session/time indexes |
| project_likes | project_id, subject_key, liked, revision, updated_at, source, migration_marker, legacy_credit | PK(project_id,subject_key); liked subject index; FK projects |
| project_like_operations | operation_id uuid, subject_key, project_id, body_hash, response jsonb, created_at | PK; locks/order/idempotent replay; immutable result |
| optimization_like_baselines | project_id, baseline_count, baseline_at, reconciliation_version, evidence_hash | PK(project_id); historic aggregate отделён от новых preferences; не тренирует модель |
| optimization_legacy_like_claims | project_id, key_hash, canonical_subject_key, claimed_at | UNIQUE(project_id,key_hash); one historic credit нельзя потратить дважды |
| optimization_migration_batches | subject_key, migration_id uuid, body_hash, result jsonb, created_at | UNIQUE(subject_key,migration_id), repeats idempotent; migration marker не обучающий event |
| optimization_lead_attribution | receipt_id integer, request_id varchar, model_version, project_id nullable, decision/exposure nullable, source_component, method, confidence_band, form_id, created_at | FK receipt; UNIQUE(receipt_id,model_version); request_id соответствует существующему varchar, не менять тип existing column |
| optimization_receipt_links | receipt_id, validated_context jsonb, analytics_subject_key nullable, outbox_state, processed_at | UNIQUE(receipt_id); только PII-free allowlist, совместное сохранение с receipt где транзакционно возможно |
| optimization_stat_aggregates | model_version, project_id, region, placement, position, device_class, metric, observation_window_version, N, successes | Composite UNIQUE; CHECK 0<=successes<=N; snapshot-scoped aggregates |
| optimization_model_snapshots | version uuid, config_version, cutoff, ingest_cutoff, finalized_through, priors, posterior, diagnostics, status, created_at | Immutable finalized data; active pointer отдельно, атомарный switch |
| optimization_model_state | placement, active_snapshot_id, revision | PK placement; CAS publish, prior valid snapshot сохраняется |
| optimization_job_runs | id, input_watermark, config_version, model_version, state, start/end, error_code | UNIQUE(config_version,input_watermark); bounded diagnostic errors без PII |

Внешние FK событий к project/receipt не должны блокировать existing content delete неожиданно. Предпочесть nullable FK `ON DELETE SET NULL` для historical log с code snapshot; составной FK exposure→item требует сохранения decision items до зависимых exposures. Конкретный retention/delete порядок: events/attribution links → exposures → items → decisions → assignment head cleanup; active snapshots/config references защищены. Test удаления контента обязателен. Для активного project_likes допустим CASCADE, baseline/claim cleanup versioned и не превращается в новый reward.

### 5.2. DDL-контракт ключевых инвариантов (проект, не migration)

```sql
CREATE TABLE optimization_assignment_heads (
  subject_key text NOT NULL,
  region text NOT NULL CHECK (region IN ('nn','msk')),
  scope text NOT NULL,
  current_decision_id uuid,
  revision bigint NOT NULL DEFAULT 0,
  PRIMARY KEY (subject_key, region, scope)
);

CREATE TABLE optimization_decision_items (
  decision_id uuid NOT NULL REFERENCES optimization_decisions(id),
  project_id integer NOT NULL REFERENCES projects(id),
  project_code varchar(8) NOT NULL,
  slot_position smallint NOT NULL CHECK (slot_position BETWEEN 1 AND 6),
  origin text NOT NULL CHECK (origin IN ('manual','exploration','posterior','fallback')),
  sampling_trace jsonb NOT NULL,
  PRIMARY KEY (decision_id, slot_position),
  UNIQUE (decision_id, project_id),
  UNIQUE (decision_id, project_id, slot_position)
);

CREATE TABLE optimization_exposures (
  id uuid PRIMARY KEY,
  decision_id uuid NOT NULL,
  project_id integer NOT NULL,
  position smallint NOT NULL CHECK (position BETWEEN 1 AND 6),
  scope_key text NOT NULL,
  region text NOT NULL CHECK (region IN ('nn','msk')),
  visible_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  visibility_rule_version text NOT NULL,
  FOREIGN KEY (decision_id, project_id, position)
    REFERENCES optimization_decision_items(decision_id, project_id, slot_position),
  UNIQUE (decision_id, project_id, position, scope_key)
);

CREATE TABLE project_likes (
  project_id integer NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  subject_key text NOT NULL,
  liked boolean NOT NULL,
  revision bigint NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL,
  migration_marker text,
  legacy_credit boolean NOT NULL DEFAULT false,
  PRIMARY KEY (project_id, subject_key)
);
CREATE INDEX project_likes_subject_active_idx
  ON project_likes(subject_key, project_id) WHERE liked;
```

Полный DDL оформляется только в соответствующем migration PR после disposable-schema proof/live evidence; excerpt не исполнялся. Не добавлять SQL enum для часто расширяемых event types без необходимости: versioned allowlist + CHECK/validation проще обновлять совместимо.

## 6. Reconciliation лайков: точная граница возможного

Исходный count может не совпадать с количеством c:/f: keys; ключи плоские, пар нет. По снимку нельзя безопасно превратить каждого fingerprint в отдельного canonical человека. `baseline_count + число импортированных favorites` запрещено без исключения уже оплаченных historic votes.

План перехода:

1. Freeze фиксированного reconcile baseline и сохранить evidence hash. Legacy writes после cutover проходят один новый adapter; два параллельных пути инкремента запрещены.
2. Для браузера при наличии проверенного avgst_voter использовать HMAC(namespace, cookie) как canonical subject; не записывать raw cookie. При отсутствии — новый opaque subject. Fingerprint — только legacy совместимость, не новая постоянная identity graph.
3. В транзакции проверить canonical row и old membership. Historic cookie claim резервирует один credit в optimization_legacy_like_claims; повторный импорт не создаёт новый. Cookie и f-key не объявлять доказанной парой только по их присутствию в массиве.
4. Local favorite импортируется как state `liked=true`, source=migration; не создаёт fresh project_liked reward. Если historic credit достоверно найден, public count не растёт. Если legacy связь неоднозначна — state можно сохранить с reconciliation_pending; публичный count не повышать на основании догадки. Оператор видит pending discrepancy.
5. Новая реальная операция пользователя после migration использует canonical state; при unlike credited historical vote уменьшает aggregate один раз, не ниже нуля; unlike действительно нового canonical vote уменьшает его delta. Не менять baseline задним числом при каждом GET.
6. Уникальный credit и per-project lock защищают одновременные claims. Для f-only recovery без cookie нет доказательства человека: никакого автоматического permanent merge. Окончательная стратегия pending/credit требует live snapshot; это blocker включения нового публичного count, а не повод терять локальное избранное.
7. Marker браузеру — только после подтверждённого server batch. Retry после timeout повторяет migration_id; original localStorage до успеха не удалять.

Fresh count можно формализовать `baseline_count + new_active_delta - retired_legacy_credits`; все величины атомарны и audit-able, без двойного учёта перенесённых исторических голосов. При отрицательном/несогласованном baseline включение счётчика блокируется, а не «исправляется» MAX(0) с потерей диагностики.

SetLiked API не toggle. Для гонок вкладок: expected_revision (или If-Match) + operation_id; stale write получает 409 и текущее состояние. Один in-flight mutation на проект в client store, очередь последнего намерения. Network failure не очищает local choice; rollback optimistic только до известной server revision. BroadcastChannel/storage event синхронизирует revision, batch read закрывает пропущенные сообщения.

## 7. API schemas

Пути `/api/optimization/*` CMS регистрируются top-level `endpoints` Payload (NEW endpoint module, server-only authorize); не `/internal/...` одновременно с альтернативным публичным именем. Внешний браузер ходит только в same-origin сайт. Все responses decisions/preferences — private no-store. Internal subject/session передаёт сайт, клиент их не выбирает.

| Boundary | Метод/путь | Вход | Выход/семантика |
|---|---|---|---|
| Site→CMS | POST `/api/optimization/decide` | placement=home.popular_projects, region/source, validated context, assignment_scope | Normal decision id/versions/items/signed receipt; typed authority failure/503. Site adapter независимо отдаёт шесть DTO fallback_lkg из local pack, без fake decision id |
| Site browser | POST `/api/optimization/events` | schema_version, batch_id, signed decision receipt, events[] allowlist | item results accepted/duplicate/rejected + reason; partial batch results; 503 retryable transport |
| Site→CMS | POST `/api/optimization/events` | normalized validated batch + server context | DB persistence/duplicate results; no model rebuild in request |
| Site browser | GET `/api/projects/likes?codes=...` | bounded codes, authenticated browser context | per-code liked/count/revision; all-liked IDs through cursor endpoint for favorites, не unbounded query |
| Site browser | PUT `/api/projects/{code}/like` | liked boolean, operation_id UUID, expected_revision | liked/count/revision; 409 stale; exact operation replay возвращает прежний ответ |
| Site browser | POST `/api/projects/likes/sync` | migration_id, bounded legacy ids | resolved/ambiguous/unknown per item, confirmed migration state; no rewards |
| Site browser | POST `/api/optimization/context/revoke` | no chosen subject; CSRF/origin protected | Удаляет server HttpOnly context cookies; disables client queue; retention policy handles historical data |
| Site browser→Server Action | `setRegion` в `src/app/actions/region.ts` | region nn/msk, reason selected/legacy_migration, expected context revision | Server cookie commit + согласованное server tree; stale migration не отменяет более новый manual selection; при ошибке старое представление сохраняется |
| Staff→CMS | GET preview + POST settings commit | expected_revision, explicit pins/region | Preview не создаёт real assignment/exposure; commit immutable version, 409 concurrent change |

Schema boundaries:

- Shared pure contract module imports no React/next/server/consent side effects. Пользоваться существующим `isRecordId`; Zod dependency must be explicit in обоих потребителях, не rely on transient install.
- Body bytes и event/item counts ограничены до JSON parse/DB; конкретные лимиты задаёт versioned config и тест boundary. Endpoint allowlist отделяет browser facts от server facts.
- Browser не может отправить ranking_assigned, project_liked/unliked, lead_accepted, delivery_updated, crm_outcome. Первые два server state changes, лид — receipt-derived.
- Client event includes project_code, event_id, occurred_at, decision_id/exposure_id, position, placement/component, device_class. Нет raw subject/FK/reward/free-text metadata/URL query. Сервер выводит owner/context из cookies/decision.
- Expired assignment не означает, что ранее валидная exposure не может дать отложенный lead: разделить assignment TTL, ingestion replay grace и attribution window. Проверять время/ownership отдельно.
- Impression duplicate с новым event_id, но тем же exposure scope не удваивает N. Conflicting UUID/body — rejected conflict, не тихий ON CONFLICT DO NOTHING.
- Подпись/lookup подтверждает состав и owner выдачи, но не доказывает физическую видимость браузера. Observer плюс антибот/limits повышают качество, не дают криптографического доказательства human impression.

## 8. SSR selector и cold-start

В штатном режиме CMS eligibility использует authoritative published recordType=project, existing standard public price resolver и primary cover resolver, excluded flag. Аварийный LKG использует последнюю проверенную региональную версию; его проверка целостности не требует доступной CMS. Не копировать price rules отдельной формулой в model. Тот же resolver factored для catalog DTO и decision adapter. Причины exclusion: draft, ready_home, missing_code, missing_cover, missing_region_price, editor_excluded, invalid_data.

Algorithm:

1. Read active config; kill switch → deterministic fallback, без model sampling.
2. Resolve region/context; lock assignment head; existing unexpired decision проверяется на config invalidation/eligibility.
3. Read candidates и pins; dedup/position conflict invalid config не чинится молча. Pins 1-based; unavailable pin диагностируется и не проталкивается в выдачу.
4. Manual: только назначенные eligible позиции; incomplete manual возвращает explicit warning, UI не притворяется шестью. Если применяется emergency fallback — origin=fallback и reason, не manual success.
5. Hybrid/automatic: fill free slots random without replacement in cold-start; seeded RNG version + seed/trace остаются на сервере. Series cap 4 применяется при достаточных допустимых альтернативах, pins не сдвигаются молча. Случайная перестановка только free positions.
6. Store decision/items + ranking_assigned в одной транзакции; при аналитически запрещённом режиме решение не становится обучающим наблюдением.
7. Return codes and exact region; SSR маппит codes→CatalogProject без тихого удаления неразрешённых элементов. Mismatch DTO/decision — отдельная re-resolve/fallback с диагностикой.

При hard constraints uniform policy равномерна **среди текущего допустимого conditional pool**, не всех исходных slate. Хранить pool per step, RNG trace, conditional probability и propensity_kind=conditional_known; безусловную slate probability/IPS weight не выдумывать. Для posterior policy propensity unknown/estimated с явным estimator version; не 1/6.

Model/decision service failure: проверенная общая редакционная шестёрка либо LKG соответствующего региона. Общий snapshot формирует отдельный publisher с pins/детерминированным добором; индивидуальные Thompson draws/owners не копируются. CMS/PG failure или неполный normal result → server-side fallback_lkg из независимого pack, ровно шесть DTO и собственные media. Не использовать random([]), public hidden или ремаппинг LKG через отказавшую CMS. Полный контракт — §3.3 и отдельная LKG спецификация.

## 9. Exposure, переходы, формы

Observer scope — `(decision_id, item, position, session/assignment scope)`. Timer запускается при >=50% intersection и visible document; сбрасывается при уходе ниже порога/tab hidden, считается непрерывная 1 секунда. Scroll back/rerender не удваивает exposure; frame/unmount cleanup обязателен. Preview и служебные проверки исключены. Доставка keepalive/batching best effort; queue ограничена bytes/count/age, analytics consent revoke очищает и останавливает её. Потерянные events — missing observations, не negative reward.

Обычный anchor остаётся работоспособным без JS. Click handler регистрирует navigation intent с source scope, а project_opened подтверждается mount страницы в видимой вкладке и валидированным переходом. Ни клик без открытия, ни prefetch не становятся opened reward. Cross-page bridge — короткоживущий opaque token/context (не PII и не unsigned source id в URL); direct open остаётся direct/unattributed. Открытие в новой вкладке/модификаторы требуют отдельного теста: sessionStorage одной вкладки не универсальный transport.

Shared share helper меняет возвращаемое значение на `{status:'success', method:'web_share'|'copy'} | {status:'cancelled'|'failed'}`; обновить **всех** callers, а не только популярные. Legacy public count сохраняется adapter-ом; event method раздельный. On cancel reward нет.

### Placement и form source registry

| Точка | Стабильный component/source | Form ID |
|---|---|---|
| Домашние popular cards | home.popular_projects / project_card | — |
| Каталог/серии/похожие | catalog.grid / home.series / project.related | — |
| Общая шапка | site.header.question | header-question |
| Hero проекта, включая mobile | project.hero.question + device_class | header-question |
| Контакты проекта/общие | project.contacts / site.contacts | contacts-question |
| Расчёт комплектации | project.configuration.quote | project-configuration |
| Калькулятор проекта/общий | project.mortgage.calculator / mortgage.calculator | mortgage-calculator |
| Ипотечная консультация | mortgage.consultation + actual placement | mortgage-consultation |
| Индивидуальный просмотр | project.next_steps.individual_visit | exhibition-visit |
| Архитектор | project.next_steps.architect | architect-consultation |
| Прочие | factory.tour / home.hero.promo / factory.open_day / referral.registration / ready_home.offer | Сохранить фактические caller IDs |

Source задаёт инициатор, не LeadForm default/URL guess. Dialog/Reveal/Panel передают typed opening context до portal. form_opened — closed→open transition, не mount скрытой формы; повтор StrictMode не событие. Контакты могут быть постоянно видимыми: отсутствие open action не компенсировать фиктивным form_opened; отдельно диагностировать visible form.

При form submit metadata содержит allowlisted optimization subobject: form_open_id, source_component, project_code/context, configuration_key при наличии, region, signed navigation receipt. Caller project name/phone/message не копируются в event log. Referral external ID никогда не resolve-ится как project.

Server receipt остаётся принятым даже при сбое analytics. Для атомарности предпочтительно сохранение PII-free receipt link/outbox в общей Payload transaction с созданием receipt; доказать участие SQL в req.transactionID. Если это не гарантировано, базовый receipt сохраняется как сейчас, а идемпотентный reconciliation reader создаёт пропущенный event/attribution по receipt_id/request_id. Он также перечитывает lookback для status changes, не только монотонный last id. Browser не создаёт lead_accepted. Учёт только после activation cutoff, не backfill старых receipts в новые exposures.

MVP attribution — последняя подтверждённая click/exposure цепочка того же проекта/session до receipt в пределах окна. Нет цепочки → block effectiveness unattributed; explicit project context может остаться project intent с отдельным method. Individual visit/architect — company intent плюс project context, не доказанная покупка данного дома. Test receipt не business reward; failed delivery не уничтожает факт accepted реального обращения, delivery stage показывается отдельно. Повтор requestId — один факт.

## 10. Модель и job

Сначала uniform cold-start, затем явное включение Bayesian policy. Не переносить legacy viewCount в N и migration like в successes.

AO-09 job:

1. Advisory lock отдельного optimization key, не migration lock. Run unique по config/input_watermark.
2. Зафиксировать received_at cutoff и допустимую event-time lateness; выбирать exposures, чьи metric-specific windows закрылись до cutoff. Pending не failure.
3. Собрать outcomes per exposure/metric; binary successes 0/1, каждый unique receipt/event не добавляется повторно. Повторы форм отражаются отдельным bounded intent index, не независимыми Bernoulli successes поверх него.
4. Для поздних событий после прежнего cutoff — recompute affected closed windows в новом snapshot по lookback/version; immutable старую историю не переписывать незаметно. Increment-only без повторного закрытия не допускается.
5. Leave-one-region-out pooled prior; положительные alpha/beta; одинаковые данные не входят дважды в prior/likelihood. При отсутствии другого региона — фиксированный versioned base prior.
6. Сохранить полный snapshot-scoped aggregates/parameters, validate 0<=X<=N, finite positive alpha/beta, config hash, maturation/coverage, max input freshness.
7. Atomically switch active model pointer, завершить run. Failure оставляет прежнюю активную версию. SSR не читает raw log и не ждёт обучения.

E/B в [0,1] с постоянной нормировкой, 50/50 весами. Конкретные веса event-rate и шкалы form/source должны быть перечислены в config revision перед Bayesian enablement; отсутствие утверждённой шкалы блокирует **только** Bayesian phase. Независимые Beta draws маргинальных rates — явно приближённая политика для correlated signals, не точный joint posterior. Holdout/A/A нужны для проверки, не «победитель через N дней».

## 11. Админка, ACL, observability

`/sampling`: Обзор, Популярные, Аналитика, Настройки, Диагностика. Эксперименты — только честная будущая заглушка, без fake arms. Соблюдать существующую типографику проекта и отсутствие декоративных надзаголовков.

Permissions: read diagnostic для staff без PII, draft pins для contentWriter, commit/mode для contentManager, опасные phase/identity/retention switches для superAdmin. Expected revision предотвращает lost update; audit immutable version хранит actor/time/reason. Preview не пишет real decisions/exposures. Manual >4 одной серии требует явного override reason, не только клиентского confirm.

Показывать origins, eligibility reasons, sample sizes, metric windows, uncertainty, event coverage, assigned≠visible, unmatched receipts, ingestion errors/duplicates/conflicts, latest job/cutoff, pending reconcile count, fallback reasons. Без fake counters и без display вероятности сделки из Q.

Отдельные flags: preferences_enabled, events_enabled, ranking_enabled, model_phase, kill_switch. Default off в code/config до controlled enablement. Отключение ranking не отключает формы/сердце; event flag не обещает стереть legacy внешнюю аналитику. Автоматические thresholds — только после versioned конфигурации и synthetic testing.

## 12. Обязательные тесты по PR

| Уровень | Набор |
|---|---|
| Unit contracts | Valid code/region; exact event allowlist; reject server-only types/PII/unknown metadata/oversize; invalid timestamp; UUID payload conflict |
| SQL integration | Composite item/exposure FK; duplicates по exposure key; concurrent same assignment; CAS preferences, operation replay/body mismatch; transaction rollback; project delete; schema-drift includes custom schema |
| Likes migration | Existing c vote + favorite; повтор batch; f-only ambiguous; same key claim from two contexts; unlike после import; baseline mismatch не удваивает count; no imported reward |
| Selector | 0/1/2/6 pins; duplicate/project position collision; draft/ready-home/no price/no image; NN-only price не MSK; 4-of-series; при alternatives не 5; shortfall warning; seeded trace reproduction |
| Events | 49%/999ms/hidden tab не impression; continuous visible 1 sec; rerender/refresh/back dedup; new session lawful scope; cancelled share vs copy; spoofed decision/owner/replay |
| Lead | Header vs mobile hero vs contacts source; individual visit semantics; receipt retry одна accepted; analytics fail не failure заявки; test delivery excluded reward; late receipt, missing chain, no PII |
| Job | Same watermark не double count; immature не failure; delayed event корректно recomputed; leave-one-region-out; alpha/beta finite; failed publish old model retained |
| Browser | Shared hearts/card/page/favorites; two tabs stale revisions; storage disabled; consent revoke HttpOnly cleanup; modifier/new-tab navigation; Server Action region commit объединяет цены и состав; pending/error сохраняет старый снимок; миграция legacy региона one-time/retry/приоритет manual; no hydration re-sort |
| Proxy/SSR | Первый запрос: cookie=internal header=decision owner, SSR готов без bootstrap fetch; forged headers/signature перезаписаны; cookie создаётся при CMS outage; concurrent first requests self-consistent и последующие сходятся к browser cookie; existing cookie concurrent requests дают одно active assignment; prefetch не exposure |
| LKG/storage/media | Обязательные 12 сценариев владельца продукта и emergency/regression дополнения — [LKG §11](adaptive-optimization-lkg.md): CMS/PG/simultaneous outage, persistent restart/recreate, corrupt update→previous, no-pack preflight, NN/MSK prices, no fake Thompson, recovery, SSR/CLS/500, independent cold media, serving replicas |
| Staging | Flags off baseline; A/A assignment balance; user-specific HTML не shared CDN; в normal режиме unpublish исключается даже при sticky/старом Data Cache; в LKG разрешена последняя проверенная версия, emergency override приоритетен; алгоритм outage → checked fallback; statistics outage → show/no training; CMS/PG outage → шесть LKG карточек и независимых media в SSR, без induced 500/CLS; synthetic concurrency/latency/pool |

Предлагаемые новые тесты: `cms/tests/optimization-{contracts,eligibility,selection,attribution,model,legacy-likes}.test.ts`, `cms/tests/integration/optimization-{schema,events,likes,decisions}.test.ts`, `e2e/optimization-{popular,preferences,events,forms,region}.spec.ts`.

Команды будущих PR: CMS typecheck + npm test; site typecheck/lint; targeted Playwright; migration→schema-drift на **одноразовой** PG; regression existing lead/context/catalog/region tests. Migration CLI/production build с настоящим DATABASE_URL во время текущего планирования не запускать. При изменении shared src/lib проверить оба приложения/обе dependency chains. Новые credentials не выводить.

## 13. Миграции, совместимость и выпуск

1. AO-01 additive schema + custom schema registration; обновить `cms/src/migrations/index.ts`, `cms/src/config/required-migrations.ts`, schema snapshots согласно существующему pipeline. Имена миграций назначаются при реализации, не фиктивная отметка applied сейчас.
2. Отдельный snapshot/backup legacy counts+keys; reconciliation dry-run отчёт. Data cutover не запихивать в implicit Payload onInit или destructive DDL.
3. Сначала CMS backward-compatible endpoints, затем public server adapters, затем UI под flags. Старые reactions routes продолжают работать, но like action после cutover всегда идёт в canonical service; share отдельно. Старый count increment не живёт параллельно.
4. Настройки/pins импортируются однократно versioned из старых slots; invalid/draft/duplicates показываются в preflight; не менять original block source до подтверждения миграции и не иметь двух активных writers.
5. Staging synthetic-only: миграции, DB constraints, concurrent requests, UI, event chain до receipt, A/A/no-store/failure. Никаких тестовых лидов в production интеграции.
6. Первый разрешённый реальный выпуск: uniform exploration + visible exposures + safe fallback, не ждать накопленной истории. До него должны быть закрыты runtime schema/reconcile/identity-consent/retention/scheduler/CDN gates и LKG gates: NN/MSK bootstrap+media, independent persistent storage, atomic rollback, restart/replicas/emergency replacement. Отсутствие исходной шестёрки блокирует activation. Bayesian flag остаётся off до model acceptance.
7. Runtime rollback — выключить ranking/model/events независимо, сохранить tables/history, сохранить независимый LKG renderer/packs или проверенную редакционную шестёрку; не возвращаться на прежний empty/random outage path. После canonical heart cutover откатывать на прежний raw SQL like increment нельзя: сохранить compatibility adapter и writer ownership. Schema down с удалением событий не является штатным rollback.
8. Регулярный job запускает внешний scheduler только после подтверждения реального исполнителя; advisory lock + idempotency обязательны при нескольких репликах. Frequency задаётся измеренными lateness/window/freshness requirements, не случайным setInterval в Next процессе.

## 14. Release blockers и что можно делать независимо

| Вопрос | Блокирует | Можно продолжать |
|---|---|---|
| Live schema/revision неизвестны | Production migrations/cutover | Contracts, pure domain code, synthetic integration harness |
| Legacy overlap неизвестен | Публичный canonical count switch | Store/UI API contract, idempotency tests, synthetic migration cases |
| Не подтверждён policy identity/retention | Real identifiers/events | Synthetic events, observer tests, flags off |
| Нет scheduler/topology evidence | Автоматический production job | CLI rebuild на disposable DB |
| CDN/SSR cache не проверены | Real assignment rollout | Local SSR/header tests и staging checks |
| Не зафиксированы E/B scales/windows | Bayesian activation | Cold-start selector и настоящие events |
| Нет независимого NN/MSK LKG, media или подтверждённого mount/topology | Активация ranking и обещание сохранения шестёрки при CMS/PG outage | Reader/publisher/contracts на synthetic стенде; editorial bootstrap, atomic/restart/replicas/cache tests. Продуктовая стратегия LKG окончательна |

Ни один blocker не подменяется тайным допущением или «готово» в админке. Для реализации технического фундамента не требуется production доступ; для безопасного применения migration и реального включения — требуется доказанная эксплуатационная картина.

## 15. Definition of Done архитектурного артефакта

Локальные источники повторно сопоставлены с RFC; описаны расхождения, scopes PR, данные/constraints, API/ownership, browser/server события, migration reconciliation, no-store/SSR/region flow, tests и release blockers. Для последнего документального изменения пересмотрены RFC/план/деградация/API/release gates и tests; описаны независимые региональные packs/media, atomic previous/bootstrap, publication-staleness exception, recovery и emergency override. Неподтверждённые mounts/topology не названы существующими. AO-01/02/03 оцениваются по фактическим отчётам ниже, AO-04 остаётся незавершённым. Функциональная готовность LKG не объявляется; реализация AO-05 и доказательства AO-10 обязательны. Production не изменён.

## 16. Фактический прогресс реализации AO-01 — 21.10.2026

После отдельного указания пользователя начать реализацию внесён первый технический этап:

- Общие чистые TS-контракты и allowlist placements/form sources в `src/lib/optimization`. Строгая проверка версии, UUID, project code, region, времени, позиции, контекста exposure и share_method; неизвестные поля/PII payload и server-only факты отвергаются. UTF-8 body и batch ограничены. Проверка подписи/ownership decision относится к следующему ingress этапу, не подменяется syntax validation.
- Шесть registered custom Drizzle tables: config_versions, decisions, assignment_heads, decision_items, exposures, events. Подключены через afterSchemaInit, не скрыты от drift. Уникальные позиции/коды/контексты и composite FK exposure→item обеспечиваются PostgreSQL.
- Добавлена additive migration `20261021_120000_optimization_foundation`, migration registry/readiness обновлены. На этом этапе нет backfill старых голосов, изменений existing counts и переноса настоящих данных.
- Добавлен append-only persistence primitive для **предварительно авторизованных** клиентских событий: accepted/duplicate/conflict, hash включает server identity context, конфликт не переписывает факт. Публичного ingestion endpoint пока нет.
- Флаги master/events/ranking/preferences по умолчанию выключены, malformed значения не включают модуль. Это конфигурационный фундамент; флаги не являются уже реализованными продуктами.
- Migration policy разрешает создание новых таблиц и ограничения на них, сохраняя запрет несовместимых изменений существующих таблиц. Добавлены проверки этой границы.
- CI дополнен isolated PG integration test. Новые dependencies в итоговом diff отсутствуют: используется официальный Drizzle proxy установленного Payload adapter.

Уточнение физической схемы относительно §5: у assignment_heads и decision_items UUID primary key; составные доменные ключи — именованные UNIQUE. Это обходит подтверждённую ошибку introspection составных PK в installed drizzle-kit 0.31.7 без ослабления инвариантов/изменения штатного drift checker. Имена новых constraints не превышают 63 символа. Модель/lead/likes таблицы следующих этапов не создаются заранее.

Проверено локально на отдельном временном PostgreSQL **17.4** (CI остаётся **18.6**): все миграции на пустой БД; module down/up в transaction; соответствие новых колонок/типов/nullability, constraints и indexes registered schema; отказы на дубли/невалидные позиции/чужую карточку; accepted/duplicate/conflict записи; отсутствие перезаписи факта. Отдельно пройден fixture test с полностью пустой disposable DB, как в новом CI step.

Результаты: **106/106 CMS tests**, PostgreSQL integration **1/1**, typecheck обоих приложений, ESLint новых исходников, git diff --check. Штатный schema-drift завершился успешно с существующим сообщением о 23 старых расхождениях имён индексов; новых исключений checker не добавлено. Общее CLI предупреждение о длинных старых Payload identifiers остаётся за рамками этого изменения.

Не реализовано этим этапом: публичные endpoints/Proxy identity, Server Action региона, shared heart UI и legacy reconciliation, observer, selector, административные настройки, обучение. Поэтому пользовательский сайт пока работает по прежнему пути. Production migrations/deploy и включение оптимизации не выполнялись; локальные проверки не являются production go/no-go.

## 17. Фактический прогресс AO-02 — 21.10.2026

По отдельному указанию пользователя реализован backend канонического лайка: five-table migration `20261021_130000_project_preferences`, set-state/CAS/idempotency, read batch/list, browser sync API, server-only CMS endpoints, signed browser identity и отдельный стабильный secret. Старые like/unlike endpoints работают через compatible writer; raw increment после передачи baseline ownership запрещён, включая гонку cutover. Подготовка baseline — отдельная dry-run по умолчанию команда, --apply атомарен и не вызывается запросами/миграцией.

Legacy c-credit, pending неоднозначные f/local imports, unlike tombstones и отсутствие fresh rewards от импорта покрыты PostgreSQL тестами. State/count/server event/operation receipt транзакционны. Редакторский save использует текущую canonical projection под Payload transaction lock; проверено настоящим Payload CRUD.

Флаги по умолчанию false, реальные данные не мигрировали, production не изменён. Shared UI store/browser migration остаются AO-03. Подробный контракт и эксплуатационные границы — `docs/architecture/ao-02-project-preferences.md`.

## 18. Фактический прогресс AO-03 — 21.10.2026

Подключены ProjectPreferencesProvider и один optimistic store для карточек, ProjectActions и фильтра избранного. Используется публичный код из CatalogProject.cmsId вместо legacy id; API получает batch до 100 кодов, list читается с пагинацией. Сначала один GET устанавливает signed identity, затем выполняются import и hydration.

Одна запись на проект в полёте, очередь последнего намерения, CAS с ограниченным rebase, повтор сетевой ошибки с неизменными operation_id/body, защита от устаревшей revision. Ошибка не стирает optimistic choice; есть явный повтор. Для pending legacy credit optimistic count не меняется. Share не перезаписывает like state.

Browser import сохраняет receipt перед отправкой, не удаляет original IDs при timeout/partial result и ставит completion marker только после полного подтверждения. Только synced IDs удаляются из legacy списка; неизвестные и неоднозначные сохраняются без повторного автоматического импорта terminal результатов. Никакого fresh like/reward от переноса. Blocked localStorage допускает работу в памяти.

Вкладки получают invalidation через BroadcastChannel/storage; focus/visibility перечитывает сервер. Без functional consent нет preference запросов, кнопка открывает настройки. Revoke отменяет запросы/очищает store, старые ответы игнорируются, серверный `/api/consent` удаляет HttpOnly preference cookies. При выключенном флаге сохранён старый UI; backend ownership AO-02 не откатывается.

Проверки: **125/125 CMS tests** (включая 9 новых store tests), **5/5 Chromium browser tests** на loopback synthetic CMS с mocked preference API; настоящий consent route проверен на HttpOnly cleanup. TypeScript обоих приложений, scoped ESLint без ошибок (прежнее img warning карточки), git diff --check. Добавлен отдельный workflow браузерных проверок без deploy. Тестовые серверы остановлены.

Флаги остаются false; production и реальные данные не изменялись. Постоянная offline-очередь новых пользовательских намерений не реализуется: полный reload восстанавливает подтверждённый server state. Подробности — `docs/architecture/ao-03-shared-heart-ui.md`. Следующий этап — AO-04, server event/decision ingress и Proxy boundary.


## 19. Проверка возврата нового посетителя и статус AO-04 — 21.10.2026

Проверка AO-02/03 через настоящий Payload REST и одноразовую PostgreSQL прошла: новый профиль без cookies/storage → functional consent → confirmed like → закрытие Chromium → новый запуск только с persistent cookies, без session cookies/localStorage → серверное избранное восстановлено. `avgst_voter` создаётся из 16 random bytes и живёт 31 536 000 секунд с обновлением при API обращениях; сессионная `avgst_preferences` подписывается повторно на его основе. Проверены одна canonical row/count=1, replay без инкремента, отсутствие import/analytics при functional-only consent. Возврат через четыре дня смоделирован проверкой expiry и удалением session cookies, без ожидания календарных суток. Изменять идентификацию не потребовалось; тест сохранён в `cms/browser-tests/optimization-browser-return.test.ts`.

AO-04 начат до изменения продуктового решения. Созданы рабочие context/decision/eligibility/event модули и тесты, но этап **не принят**: конкурентный integration-прогон решений не завершён успешно (cancellation дочернего теста/ошибка FK при cleanup), причина пока не установлена; штатный success/rollback ещё нужно доказать. Наработки сохранены, текущие hidden/authority-unavailable контракты требуют согласования с новой политикой до завершения AO-04. Три unit проверки подписей/UUID и отдельная Proxy проверка проходили, что не заменяет весь integration suite. Рабочие flags остались выключенными; локальная тестовая PG остановлена. Ничего не выложено.

## 20. Изменение политики отказоустойчивости — документальный шаг

По окончательному указанию пользователя удалены требования скрывать блок и запрещать LKG. Добавлены [техническая спецификация LKG](adaptive-optimization-lkg.md), canonical [RFC](adaptive-optimization-architecture-rfc.md), file mapping AO-04/AO-05A–C, release/DoD gates и тестовая матрица. Discovery сохранён как исторический факт, дополнен текущим статусом. На этом шаге функциональный код/feature flags/production не изменяются; прежние наработки AO-04 не откатываются. Механика хранения, media и SSR LKG реализуется в AO-05 до activation; AO-04 заранее закрепляет границу delivery source и failover-compatible contracts, AO-06/09 отделяют LKG от обучения, AO-10 доказывает эксплуатационную отказоустойчивость.
