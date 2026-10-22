# AO-03: общее состояние избранного

Реализовано 21.10.2026. Подключён клиентский слой к backend AO-02. Флаги в `.env.example` остаются выключенными; production и реальные данные не изменялись.

## Подключение и идентификаторы

Root layout передаёт вычисленный на сервере `optimizationFlags().preferences` в `ProjectPreferencesProvider` внутри ConsentShell. Секреты в клиент не передаются. Один экземпляр `ProjectPreferencesStore` принадлежит одному mounted root; серверного глобального хранилища состояния посетителей нет.

При включённом флаге карточка, ProjectActions и каталог читают один optimistic store через `useSyncExternalStore`. `CatalogProject.cmsId` — публичный восьмизначный код CMS; `CatalogProject.id` может быть старым slug или `cms:123`. API и фильтр избранного используют код CMS. У BoardItem есть отдельный projectCode. Проекты без валидного кода не отправляются в API.

При выключенном флаге сохранён прежний UI/legacy storage. Это не разрешение откатывать владельца счётчика в CMS: ограничения writer/baseline AO-02 действуют независимо от UI.

## Чтение и запись

После functional consent один первоначальный GET list устанавливает signed browser identity и читает серверное избранное со всеми страницами. Затем выполняется browser import, после него — batch hydration зарегистрированных проектов, максимум 100 кодов в запросе. Отдельного GET на каждое сердечко нет. Карточки, добавленные при навигации, регистрируются в том же store.

Сердечко меняется сразу. Store хранит подтверждённую revision, последнее намерение и текущую operation. На один проект допускается одна запись в полёте; быстрые последующие клики сводятся к последнему намерению. Source указывает UI, начавший обработку очереди. При ответе 409 с актуальным состоянием операция пересоздаётся с новой revision и UUID; автоматическое разрешение конфликта ограничено, затем предлагается ручной повтор. При 428 тот же запрос повторяется один раз после установки cookie ответом сервера.

При сетевом сбое сохраняются optimistic choice и **та же operation_id с неизменным телом**. Кнопка повтора продолжает операцию; потерянный после commit ответ не создаёт второй голос. Старый ответ с меньшей revision не переписывает более свежий state. Для reconciliation pending/required optimistic UI не увеличивает и не уменьшает публичный count на основании недоказанного legacy credit.

Mutation intent хранится в памяти текущего root, а не в постоянной offline-очереди: после полной перезагрузки страницы восстанавливается серверное состояние. Таймаут запроса — 12 секунд. Неподтверждённая запись не объявляется сохранённой: доступен повтор.

## Browser import

При functional consent читается `avgst:favorites`. Строго допустимые IDs отправляются пачками до 100; перед отправкой сохраняется receipt `{migration_id, legacy_ids}` в `avgst:preferences:migration:v1`. При timeout или partial requires_baseline receipt и исходный список сохраняются. Повтор использует то же тело/ID. Storage может быть недоступен: тогда receipt живёт в памяти, а canonical rows AO-02 защищают от повторного credit после перезагрузки.

Только после полного подтверждения каждого ID выставляется marker `avgst:preferences:imported:v1`. Из исходного списка удаляются только IDs с результатом synced; unknown/ambiguous/unavailable и невалидные исходные значения сохраняются. Подтверждённые terminal IDs повторно автоматически не импортируются. Миграция не отправляет PUT /like и не создаёт fresh like/reward. Серверный unlike tombstone имеет приоритет над импортом.

Неперенесённые ID без однозначного опубликованного проекта не становятся видимыми карточками канонического избранного. Для решения неоднозначностей остаётся reconciliation AO-02; браузер не угадывает соответствие.

## Вкладки и согласие

После подтверждённой записи отправляется invalidation через BroadcastChannel и storage event; передаётся только сигнал перечитать сервер. Сообщение другой вкладки не считается доверенным liked/count/revision. Сигналы объединяются с задержкой 80 мс. Focus/возврат видимости выполняет серверное чтение для восстановления пропущенных изменений.

Без functional consent нет bootstrap, import, preference reads или writes; нажатие открывает настройки согласия. При отзыве очищается store, abort-ятся запросы и игнорируются ответы прежнего поколения. Новые storage keys добавлены в functional cleanup. `/api/consent` удаляет HttpOnly avgst_preferences и avgst_voter серверным Set-Cookie при same-origin запросе с functional=false. Это не удаление уже сохранённых исторических фактов CMS.

Share сохраняет существующий отдельный путь. Его ответ больше не перезаписывает canonical like state/count. Существующая аналитика просмотров остаётся самостоятельной; exposure/decision attribution не реализуется этим этапом.

## Проверки

- CMS test suite включает 9 новых store tests: единый state, batch/лимит 100, быстрые клики, потерянный commit response, CAS и поздняя revision, partial import и marker, недоступный storage, 428 bootstrap, revoke с поздним ответом.
- `npm run test:e2e:preferences`: 5 Chromium tests на синтетическом loopback CMS и mocked browser preference API. Проверены карточка/страница/две вкладки/каталог, migration без fresh PUT, повтор после сетевого сбоя, blocked storage, отсутствие запросов без consent и настоящий серверный Set-Cookie cleanup. Это браузерная проверка AO-03; PG транзакции отдельно проверены AO-02, здесь не подменяются mock-тестом.
- TypeScript сайта и CMS, scoped ESLint, git diff --check. Отдельный workflow project-preferences запускает браузерные проверки без production credentials/deploy.

Не входит в AO-03: Proxy ranking identity, SSR assignment, Server Action региона, visibility observer, recommendation selector и обучение. Следующий этап плана — AO-04.
