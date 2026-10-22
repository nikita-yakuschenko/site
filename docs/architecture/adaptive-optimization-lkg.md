# AO-001: независимый Last Known Good для популярных проектов

Дата: 21.10.2026. Статус: **утверждённая продуктовая политика, проект технической реализации**. Основание — последнее указание владельца продукта в чате. Оно отменяет прежний запрет устаревших данных при отказе CMS. Этот шаг изменяет только документы; наличие описанного механизма в runtime не заявляется.

Связанные документы: [RFC](adaptive-optimization-architecture-rfc.md), [Implementation Plan](adaptive-optimization-implementation-plan.md), [discovery](adaptive-optimization-discovery.md). При расхождении со старым описанием публикационной безопасности действует эта редакция.

## 1. Граница изменения и установленное состояние

Меняются формирование, доставка, кеширование и аварийное происхождение выдачи. Канонические лайки AO-02/AO-03, идентичность избранного, Thompson Sampling, региональные модели и баланс 50/50 сохраняются.

Проверено чтением текущего кода, без обращения к production:

| Источник | Факт | Следствие |
|---|---|---|
| `src/lib/popular-content.ts` | Parts читаются с revalidate=60; затем каталог, слоты по cmsId/code или random до 6 | Нет долговечного независимого резерва; частично назначенные слоты не дополняются |
| `src/lib/catalog/cms-provider.ts` | React cache, request-time connection, fetch revalidate=60, timeout 15 секунд; ошибка превращается в [] | Пустой результат не отличает отказ источника от пустого каталога; этот путь нельзя использовать как единственный resolver популярных |
| `src/components/popular-projects.tsx` | Заголовок/CTA и grid строятся из готовых props; preview меняет их только в CMS iframe | Сервер может передать самостоятельные карточки LKG без изменения дизайна и клиентского bootstrap |
| `src/components/project-card.tsx` | Карточка использует имя, href/slug, изображение, метрики, технологию и региональную цену; сердце использует cmsId | LKG нужен полноценный публичный DTO; одних codes недостаточно. liked/count/revision в общий snapshot не входят |
| `src/lib/media.ts`, `next.config.ts` | img получает URL через optimizedSrc → /_next/image; разрешены локальные файлы и конкретные CMS origins | Холодный image cache обращается к CMS; сохранять только URL недостаточно |
| `cms/src/collections/Media.ts`, `cms/next.config.ts` | CMS upload staticDir, media API с проверкой доступа и max-age=2592000; directory берётся из CMS_MEDIA_DIR | Даже физически сохранённые CMS uploads не являются независимой доставкой: API/доступ могут требовать CMS/БД |
| Корневой Dockerfile | standalone, public и static копируются в образ; runtime non-root | В образ можно включить автономный bootstrap pack; записываемый постоянный LKG mount сейчас не объявлен Dockerfile |
| CMS Dockerfile, release docs | Два приложения, Dokploy/Swarm, отдельный CMS release; поддерживается настройка media directory | Ни общий mount публичного сайта, ни число/размещение реплик, ни CDN-конфигурация не подтверждены |

Discovery — исторический срез до AO-01; его отрицательные результаты не объявляются заново актуальными. AO-01 создал фундамент схемы, AO-02/03 реализовали каноническое избранное. AO-04 находится в работе: добавлены незавершённые context/decision/event модули, но его конкурентная integration-проверка пока не пройдена. Эти изменения не откатываются. Временная тестовая PostgreSQL остановлена; production не затрагивался.

Отдельная уже выполненная проверка AO-02/03: настоящий Payload REST → одноразовая PG, store AO-03, закрытие и новый запуск Chromium с сохранением только persistent cookies и без localStorage. Восстановились серверные liked/count=1; replay не увеличил count, import не понадобился. Долговременный ключ — avgst_voter, 16 случайных байт, HttpOnly, SameSite=Lax, 31 536 000 секунд, обновляемых API. avgst_preferences сессионная, после перезапуска подписывается снова на основе того же voter. Возврат через четыре дня моделировался отбором cookies, чей срок больше этой даты, а не ожиданием четырёх суток. Исправление идентификации не потребовалось. Этот факт не доказывает готовность LKG/AO-04.

## 2. Политика выдачи

| Состояние | Серверный результат для блока | Аналитика |
|---|---|---|
| Источники доступны | Адаптивная шестёрка текущего режима с актуальной eligibility | По проверенному контексту и consent |
| Алгоритм/decision persistence неисправен, CMS доступна | Проверенная региональная редакционная шестёрка либо региональный LKG | Отдельное аварийное происхождение; не posterior sampling |
| Статистика/Event Collector недоступны | Карточки остаются; показываются актуальные данные либо LKG по состоянию остальных источников | Обучение/доставка событий приостановлены, UI их не ждёт |
| CMS недоступна/таймаут/невалидный ответ | Независимый региональный LKG с собственными изображениями | fallback_lkg, snapshot id/version; без фиктивного назначения |
| PostgreSQL недоступен | Тот же LKG, без вызова PostgreSQL на пути чтения | Потери событий допустимы |
| CMS и PostgreSQL недоступны | Тот же LKG | Не создавать обучающие наблюдения за прошедший период задним числом |
| Актуальный snapshot повреждён/не читается | Предыдущая проверенная версия того же региона, затем bootstrap из образа | Причина и реально прочитанная версия в диагностике |
| Источники восстановились | Новая authoritative-проверка → обычная выдача; обновление общего LKG отдельным publisher | Исторические LKG показы не превращаются в normal observations |

Ни infrastructure error, ни возраст LKG сами по себе не скрывают секцию и не возвращают [] в SSR. Во время аварии допускается устаревший публикационный статус и цена последней проверки. В штатном режиме eligibility и исключение снятого проекта продолжают действовать. Shortfall/ошибка конфигурации не публикует неполный LKG: сохраняется предыдущий полный pack, оператор получает причину. Если штатный selector не может предоставить полную шестёрку, renderer использует полный резерв с аварийным происхождением, а не выдаёт короткий список за нормальную работу.

Инвариант шести имеет физическую предпосылку: перед активацией и каждым выпуском существуют пригодные наборы NN/MSK. При отсутствии всех копий это нарушение preflight/эксплуатации, а не разрешённое поведение hidden. Технически гарантировать шесть неизвестных проектов из отсутствующих данных невозможно.

## 3. Минимальное хранилище

Предлагается **файловый versioned pack на стороне публичного сайта**, без нового Redis/S3. Содержимое: JSON manifest + нормализованные файлы карточек + указатели версий. Оно не обращается к CMS/PG при чтении.

Проектируемый, ещё не настроенный layout:

```text
/var/lib/avgst/optimization-lkg/        # persistent site-owned mount, не CMS_MEDIA_DIR
  packs/<pack-id>/manifest.json        # immutable, содержит региональные snapshots
  blobs/<sha256>.webp                  # content-addressed, immutable
  active.json                         # атомарный pointer: current + previous NN/MSK
  active.previous.json                # независимая копия последнего проверенного pointer
  emergency.json                      # отдельный versioned override/exclusions
```

В публичный образ включается `public/optimization-lkg-bootstrap/` — заранее проверенные JSON и **сами изображения** для NN/MSK. Это последний независимый резерв при потере mount, не файловая копия внутри временного слоя контейнера. Новый образ не выпускается без bootstrap pack. Runtime publisher обновляет mounted store, а регулярный согласованный релиз обновляет bootstrap. Оба источника читаются одним строгим валидатором. Предыдущий рабочий образ также должен содержать совместимый pack для rollback.

Предпочтение persistent bind/volume использует возможности существующего Dokploy, но **его наличие, fsync/rename семантика, права uid 1001 и сохранность при reschedule ещё требуют подтверждения**. Один host-local volume не считается общим хранилищем нескольких Swarm nodes.

Для одной ноды/реплик на одной ноде допустим один общий persistent каталог и единственный publisher. Для нескольких нод требуется либо уже существующий согласованно доступный shared filesystem с подтверждёнными гарантиями, либо распространение immutable pack и атомарная активация через существующий процесс выпуска на все serving replicas. Локальный bind без такого распространения запрещён. Реплика допускается к трафику после проверки generation/checksum pack; допустимое окно рассогласования версий измеряется и фиксируется. Нельзя предполагать наличие NFS или добавлять его молча.

Память процесса разрешена только как ускорение поверх проверенного pack. Next Data Cache, image cache, PostgreSQL и CMS uploads не считаются единственной копией. При неподтверждённой топологии можно реализовать reader/publisher и тестировать локально; activation gate остаётся закрытым.

## 4. Snapshot и данные карточки

Проектируемый schema_version=1:

```text
RegionalLkgSnapshot {
  schema_version: 1,
  snapshot_id: UUID,
  region: 'nn' | 'msk',
  generation: positive integer,
  generated_at, validated_at: UTC timestamps,
  content_sha256: SHA-256(canonical public payload excluding this field),
  policy: { mode, config_version, selection_policy_version },
  presentation: { heading, catalog_label, catalog_href },
  items: [exactly 6 ordered PublicCardDTO],
  reserves: [optional previously validated replacement cards]
}
PublicCardDTO {
  project_code, legacy_catalog_id, slug, name, href,
  image: { local_path, sha256, width, height, mime, byte_length },
  area, areaValue, floors, floorsValue, bedrooms, bathrooms,
  technology, technologyBadge, series,
  price: { region, amount, label, validated_at }
}
```

Pack manifest связывает оба региональных snapshot, hashes всех blobs и предыдущую generation. `content_sha256` защищает от неполной/случайной порчи; право на запись контролируется mount/publisher. Checksum сама по себе не доказывает доверенность злоумышленно заменённого manifest. При внешнем переносе pack фиксируются digest артефакта и доверенный оператор/канал выпуска.

Разрешены только публичные данные. Нет visitor/subject/session/decision/exposure ID, cookies, liked/revision, событий, контактных данных, CMS keys, signed media URLs и чужих URL query. Контекст индивидуального Thompson-назначения не копируется в общий резерв. Самостоятельный snapshot ID не является decision ID.

Reader проверяет schema version, region, timestamps, checksum, шесть уникальных project codes/позиций 1–6, допустимые DTO/числовые характеристики, локальные media paths, hashes/размеры файлов, положительную целую публичную цену **для того же региона**, safe relative href и presentation. Missing media/цена/карточка делает candidate pack непригодным. Snapshot не объединяется по полям с другим регионом или новой версией: данные и порядок образуют единый bundle.

Adapter строит минимальный CatalogProject: cmsId=project_code, id=legacy_catalog_id, href/slug/имя/метрики из snapshot; regionalPrices содержит подтверждённую цену выбранного региона. Сердце по-прежнему обращается к AO-02 через code; состояние пользователя не выводится из snapshot. Если API лайка недоступен, остаётся механизм ошибки/повтора AO-03, а не ложное подтверждение или fallback writer.

## 5. Независимые изображения

Publisher заранее получает bytes каждого cover, пока источник здоров. Для CMS это существующий разрешённый media endpoint; локальные public assets можно брать из известной директории сайта. Источники ограничены утверждёнными origins/paths, размеры скачивания/декодирования ограничены. Изображение декодируется, проверяется, нормализуется в WebP без служебных metadata и сохраняется под hash. Успешный HEAD/URL в JSON не считается проверкой наличия bytes.

Будущий site media handler `/api/optimization/lkg-media/<sha256>.webp` читает только blobs из проверенных packs либо bootstrap. Никакого проксирования на CMS, auth lookup в PostgreSQL, произвольных filesystem paths или remote fallback. Это публичные изображения; immutable content-hash URL позволяет public cache. Reader/handler доступны и при выключенном ranking/event flag.

ProjectCard получает этот same-origin URL. Существующий optimizedSrc совместим с локальным URL: /_next/image при cold cache читает **site handler**, а не CMS. Проверить max-width/quality из next.config, реальные response headers и холодный cache после recreate контейнера. При отказе самого оптимизатора допускается заранее изготовленный локальный размер карточки через тот же handler; не разбитая картинка. Proxy не создаёт контекст для media/API запросов.

GC не удаляет blobs, достижимые из current, previous, bootstrap и emergency packs. Старые immutable URL должны оставаться доступны дольше максимального HTML/image cache lifetime и rollback window; удаление только после подтверждения отсутствия serving versions. Snapshot/JSON и images восстанавливаются как один комплект.

## 6. Формирование и атомарная публикация

Единственный владелец — publisher публичного сайта/оператор release, **не SSR запрос посетителя** и не транзакция CMS. CMS предоставляет актуальные публичные данные и конфигурацию, но не является обязательным dependency reader-а.

1. До включения оптимизации оператор создаёт NN/MSK editorial bootstrap из опубликованных проектов с региональными ценами. Минимум шесть уникальных в каждом; все media copied. Отчёт preflight и hashes входят в артефакт выпуска.
2. Общий LKG формируется отдельно от посетительских назначений. Manual использует проверенные шесть pins; hybrid сохраняет pins/позиции и детерминированно добирает свободные позиции; automatic использует отдельную стабильную editorial fallback policy из eligible pool. Не брать случайно последнего посетителя/его TS draws. Математика обычных решений не меняется.
3. Publisher запускается при явном изменении/публикации редакционного набора, подтверждённом изменении проекта/цены, периодической проверке свежести и после восстановления источников. Для необязательного scheduler используется существующий release/CLI механизм; нельзя полагаться только на after(), render или таймер Next процесса. До выбора scheduler ручной подготовленный pack остаётся необходимым bootstrap.
4. Прочитать authoritative published records, текущие standard public prices и primary covers теми же resolver-ами, что каталог; проверить pins/exclusions. При невозможности собрать полную корректную шестёрку candidate отклоняется, предыдущий остаётся.
5. Создать staging pack на **том же filesystem**; скачать/проверить все assets, записать immutable manifest, fsync файлов/каталога, read-back проверить digest и независимый render. Незавершённый staging не виден читателям.
6. Единственный writer с filesystem lock и expected_generation выполняет compare-and-publish: rename staging → immutable pack; сохранить проверенный старый pointer через atomic rename active.previous.json; затем atomic rename нового active.json, содержащего current/previous, с fsync родителя. Backup pointer обновляется только из валидного active, не из повреждённого файла. При порче самого active.json reader использует отдельный active.previous.json; не пытается извлечь previous из неразбираемого JSON. Crash между переключениями оставляет прежний active работоспособным. Проверить гарантии на выбранном storage; process Map и PG advisory lock не заменяют независимую блокировку publisher-а.
7. При ошибке до commit active pointer не меняется. При порче current reader проверяет previous, затем bootstrap. Не мигрировать/«чинить» JSON на каждом GET и не перезаписывать previous повреждённым current.

Активация NN/MSK pointer выполняется одной согласованной generation; отдельные snapshots остаются строго региональными. Конкурентное позднее обновление со старой generation отвергается. При необходимости schema v2 сначала выпускается reader, понимающий v1/v2, затем publisher; старый bootstrap не становится непригодным из-за обновления writer-а.

## 7. Server resolve, регион и кеши

Public-site adapter первым получает согласованный server region, затем пытается обычный resolve в ограниченном бюджете. При timeout, transport/DB/CMS error, невалидном/неполном ответе выбирает региональный LKG из local independent storage. Этот catch расположен **снаружи** CMS и её PG-транзакции. Для LKG не вызываются catalog.list(), CMS parts, project-by-code или like/stat endpoints. Достаточные presentation данные есть в pack/статической секции.

Начальный budget и интервалы retries задаются версионируемой конфигурацией и проверяются на стенде; они не наследуют незаметно последовательные 15s+5s старых readers. Circuit breaker может ускорять возврат LKG, но не хранит единственную копию. Пробная нормальная проверка после bounded backoff не зависит от event collector; error state не закеширован навечно. После восстановления валидная текущая выдача получает приоритет, а publisher независимо обновляет LKG. Ошибка обновления LKG не отменяет успешно полученную обычную выдачу.

Server Action региона сохраняется: cookie/серверное дерево/цены/шестёрка переключаются согласованно только после успешного commit. Если CMS недоступна, action/resolver использует готовый pack **нового региона**, не старый snapshot с новым label. При недоступности именно action/server transport прежний подтверждённый регион и вид сохраняются. Browser migration региона не отменяет новый ручной выбор.

`router.refresh()` не очищает Data Cache. Normal decision/authoritative validation и итоговый response используют no-store/private; общий 60s catalog cache не является LKG и не маскирует инфраструктурный отказ. LKG loader читает current pointer без постоянного Next Data Cache; допустимо кешировать immutable файл по hash с проверкой целостности. Для общего LKG нельзя кешировать персональные liked или signed assignment tokens.

Не отдавать персональный HTML через shared CDN. Для SSR/RSC действуют private/no-store и корректные Vary/кэш-правила фактического reverse proxy. Shared cache допускается для immutable blobs. Router Cache/prefetch/back-forward отдельно проверяются на смену региона, возврат normal↔LKG и восстановление источника; prefetch не создаёт assignment/reward. Обновление SSR из normal в LKG не меняет число/размер секций и не требует клиентской подмены.

Остальные зависимости главной (layout parts, шапка, аналитика, redirects) также не должны бросать исключение, уничтожающее SSR с уже доступным LKG. Это regression AO-05/AO-10, не обещание автономной работы каждой страницы каталога при падении CMS. Ссылки остаются обычными anchors; доступность самих страниц проектов/форм зависит от их сервисов, и LKG не имитирует успешный like/lead при отказе backend.

## 8. Контракты и аналитика

Будущий **site-level** PopularRenderResult — discriminated union:

```text
{ status:'ready', source:'adaptive'|'fallback_checked', region, items:[6 DTO],
  decision_context?: validated persisted context }
| { status:'ready', source:'fallback_lkg', region, items:[6 DTO],
    snapshot_id, snapshot_version, snapshot_checksum, validated_at,
    fallback_reason, training_eligible:false }
```

CMS `/api/optimization/decide` сохраняет server-only auth и нормальные решения с code/position/origin/versions. Отказ CMS — transport/503, недоступность авторитета — typed `authority_unavailable`; site adapter преобразует его в fallback_lkg. Внутренняя диагностика shortfall остаётся, но не становится пустой/короткой аварийной секцией. `hidden` исключается из нормального public render результата. Браузер не выбирает source, region, IDs snapshot или eligibility обучения через произвольный POST.

Для fallback_lkg нет fake decision_id, ranking_assigned, model_version/propensity, подписи «это Thompson». Source аварийной выдачи — **не новый sampling origin в PG enum**, а отдельный render/delivery context. Уже созданные AO-01 tables и лайки не требуют миграции только ради LKG.

AO-04 согласует allowlist и подпись/lookup независимого delivery receipt, если решено собирать LKG события. AO-06 может передать snapshot id/version + source в отдельном проверенном fallback scope; collector не обязан читать CMS/PG ради показа. Пока collector не поддерживает этот контракт, LKG события пропускаются, а не отправляются с притворным adaptive decision_token. Любые принятые LKG события сохраняются отдельно как training_eligible=false; job AO-09 явно исключает их из N/X/prior/posterior. Нет backfill выдуманных показов после аварии. Канонический functional like остаётся AO-02; analytics failure не блокирует разрешённую запись лайка и не превращает import в reward.

## 9. Диагностика и экстренное управление

Вне публичного UI фиксируются регион, реальный source, snapshot id/version/checksum, generated_at/validated_at, возраст, причина, начало и длительность fallback, последнее успешное normal-read/publish, ошибки reader/publisher и rollback к previous. Возраст выше установленного порога вызывает alert, но **не TTL-удаление или скрытие**. Историю состояния можно сохранять в том же independent volume/системе логов; при отказе PG диагностический read не должен падать вместе с PG.

Экстренная замена выполняется через ограниченный site CLI/release доступ оператора, без входа в Payload. В independent store публикуется generation override с причиной, allowlist project codes, подписью/digest доверенного пакета и локальными media. Emergency denylist применяется ко всем поколениям, включая previous/bootstrap, и не сбрасывается recovery CMS или GC. Полноценная замена тоже атомарна и допускается без CMS, если все данные/изображения прошли проверку в сохранённом редакционном pack.

Файл emergency.json не может быть единственной копией запрета: иначе потеря mount вернёт исключённый проект из bootstrap. Независимая desired policy закрепляется также в конфигурации существующего site deployment (проектируемый allowlist codes/minimum emergency generation, без секретов) и распространяется на все replicas; backup/образ содержит достаточные локальные replacement cards. При необходимости используется обычный согласованный site release без CMS/PG. Успех операции подтверждается после доставки policy и полной шестёрки всем serving экземплярам. Испорченный override восстанавливается из предыдущего проверенного override/desired policy, не трактуется как пустой список запретов. Это эксплуатационное требование, не описание уже настроенных переменных Dokploy.

Удалить один из ровно шести и одновременно сохранить шесть без запасных проектов невозможно. Поэтому preflight emergency-сценария требует проверенный запас подходящих карточек того же региона (для исключения одного — минимум один независимый запасной), либо заранее подготовленную альтернативную шестёрку. Если запас исчерпан, операция не подтверждается как успешно подготовленная аварийная шестёрка: оператор должен доставить полный replacement pack. Нельзя молча вернуть запрещённый проект, придумать новую цену или превратить это в штатный [] fallback. Ограничение ёмкости запаса и процедура реального экстренного удаления документируются до activation; произвольное число исключений не обещается.

Обновление CMS pins не снимает независимый emergency override без явной операции оператора. После восстановления требуется reconciliation override с текущей политикой, а не незаметное возвращение экстренно исключённого проекта.

## 10. Этапы и затрагиваемые файлы

Ни один из перечисленных функциональных файлов в этом документальном шаге не изменяется ради LKG.

| Этап | Будущие изменения | Зависимости/приёмка |
|---|---|---|
| AO-04 завершение | `src/lib/optimization/contracts.ts`, `{server-client,server-context}.ts`, `cms/src/optimization/{decisions,events,endpoints}.ts`; убрать hidden как public failure result, различить authority failure и shortfall; подготовить delivery source boundary | Сохранить текущие наработки. Закрыть незавершённую concurrency/rollback integration проверку. LKG не требует PG decision/exposure для SSR |
| AO-05A pack | NEW `src/lib/optimization/lkg/{contracts,validate,reader,publisher,media}.ts`; NEW `scripts/optimization-lkg-{prepare,preflight,publish,override}.mjs` или TS-эквиваленты; bootstrap JSON/media | Shared региональный pack, strict validation, атомарность/previous, независимый media reader; не персональное назначение |
| AO-05B SSR и регион | `src/lib/popular-content.ts`, `src/app/page.tsx`, `src/components/{popular-projects,project-card,block-renderer}.tsx`, `src/lib/catalog/cms-provider.ts` при необходимости typed errors, `src/app/actions/region.ts`, region bootstrap/switch | Нормальный budget resolve либо полные DTO LKG в первом HTML; отсутствие лишнего CMS remap; Server Action согласован с ценой и составом |
| AO-05C доставка | NEW `src/app/api/optimization/lkg-media/[asset]/route.ts`; корневой Dockerfile, bootstrap artifact, package scripts, deploy/readiness docs, next.config при доказанной необходимости | Public bytes с независимого mount/образа; cold optimizer; mount/recreate/multi-replica proof; не менять конфигурацию production этим PR |
| AO-06/AO-09 | Observer/queue/contracts, агрегирование | fallback_lkg не выдаётся за algorithm assignment и не входит в обучение; event loss не ломает UI |
| AO-08 | Diagnostics/admin integration | Обычная CMS админка показывает LKG status при доступности; аварийный CLI от неё независим |
| AO-10 | Integration/Playwright/deploy fixtures | Отказы, восстановление, media, container/replica/cache gates; только synthetic staging до разрешённого выпуска |

AO-05A/C выпускаются до переключения главной на adaptive resolver. Подготовка и проверка bootstrap NN/MSK предшествуют активации любых ranking flags. Disable ranking/rollback сохраняет independent renderer и pack; возвращаться на старый random([]) путь нельзя. DDL AO-01, ownership/counters/UUID receipts AO-02 и store AO-03 не откатываются.

Сам reader/media и серверный аварийный adapter не зависят от OPTIMIZATION_ENABLED, ranking/events flags или доступности новых PG таблиц. Flags управляют адаптивным назначением/сбором, а не наличием коммерческого блока. Это обеспечивает LKG и при kill switch/выключении модуля; соответствующий regression проверяется до activation.

## 11. Обязательные тесты и доказательства

Это требования к следующим PR, **не уже выполненные тесты LKG**.

| № | Сценарий | Проверяемое доказательство |
|---|---|---|
| 1 | CMS выключена/таймаут/невалидный JSON | SSR 200 содержит секцию, заголовок, CTA и шесть уникальных карточек из LKG; после выбора LKG нет CMS reads |
| 2 | PostgreSQL выключен при доступном сайте | Reader/media работают без DB; шесть карточек, отсутствие ожидания pool на fallback пути |
| 3 | CMS + PostgreSQL выключены одновременно | Холодный запрос и браузер с пустыми cache получают полный блок без обращения к отказавшим сервисам для LKG |
| 4 | Restart/recreate/reschedule Next | Current pack переживает recreate на доказанном mount; при потере mount bootstrap в образе доступен; проверка нового процесса, не просто module reload |
| 5 | Partial write, crash до/после rename, concurrent publishers, bad checksum/missing image | Старый active/previous остаётся читаемым; generation CAS; staging не становится active; rollback восстанавливает комплект |
| 6 | Нет initial pack или NN/MSK/asset неполон | Preflight/activation запрещены; нельзя считать готовым пустой каталог или автоматически включить flags |
| 7 | NN↔MSK при CMS outage | Только соответствующая региональная цена; Server Action и browser region migration не показывают старую цену/выдачу под новым label |
| 8 | LKG/event collector отказал | Нет fake ranking_assigned/propensity; fallback receipt source подтверждён либо событие пропущено; N/X/prior не меняются |
| 9 | CMS восстановилась, unpublish/price/cover изменились | Новая normal выдача актуальна; publisher обновляет pack; прежний emergency denylist не отменяется recovery |
| 10 | Normal↔LKG, SSR/RSC/prefetch/back navigation | Шесть cards/те же размеры, нет исчезновения/позднего client refill/induced 500/CLS; нет user-specific shared CDN cache |
| 11 | CMS media API/host недоступен, cold Next image cache | Все шесть изображений 200 + decode в браузере; network trace не обращается к CMS; проверка direct local derivative при отказе optimizer |
| 12 | Несколько serving replicas/nodes | Одна разрешённая generation/checksum или доказанный bounded rollout; reader доступен каждой; bootstrap не зависит от node-local потерянного диска |
| 13 | Экстренно исключён проект во время CMS outage | Независимый override заменяет карточку из регионального резерва; шесть остаются; запрещённый code не возвращается через previous/bootstrap/recovery |
| 14 | AO-02/03 и обычный selector/events | Сохраняются replay/CAS/no-double-count/import-no-reward тесты, флаги off, pins/diversity/normal publication и bounds ingestion |

Container/infra proof проводится на одноразовом стенде: выключать реальные CMS/PG в production ради теста запрещено. Cached браузерные картинки не доказывают независимость изображений. Только mocked API не доказывает restart/storage/multi-node семантику.

## 12. Эксплуатационные требования без подтверждения production

- Установить число serving replicas/nodes, placement/reschedule, actual persistent mount сайта, filesystem/права/квоты, атомарность rename/fsync и распределение между нодами. Наличие CMS_MEDIA_DIR недостаточно.
- Утвердить owner/единственный writer, способ блокировки, scheduler/ручной fallback запуска, max pack size/retention, backup/restore и журнал generation. Проверить disk full/read-only/потерю mount.
- Подготовить реальные редакционные NN/MSK шестёрки и media до activation, резерв для аварийного исключения; утвердить допустимые age alerts и восстановление previous/bootstrap. Текущие данные/цены этим документом не извлекаются и не выдумываются.
- Подтвердить public routes/HTTPS/origins для media, отсутствие CMS credentials в pack, независимость serving bytes от CMS API/PG и CMS volume lifecycle.
- Проверить реальные CDN/reverse proxy/Router Cache headers и TTL, exclusion персонального HTML, передачу region/cookies, normal→LKG→normal при cold/warm caches.
- Согласовать новые health/readiness/preflight как gate **активации оптимизации**; сбой collector/CMS не должен автоматически выводить все site replicas из балансировщика и уничтожать доступный LKG.
- Для аварийного использования старого slug подтвердить приемлемость потенциального 404 на странице проекта либо отдельный будущий локальный routing plan. LKG гарантирует блок и media, а не подменяет offline backend всех страниц/форм.
- Зафиксировать trusted operator path для independent replacement/exclusions и процедуру распространения pack/override на все serving instances. Production настройки пока не изменяются.

Критерий завершения реализации: при полном отказе CMS и её PostgreSQL публичный сайт отдаёт первый HTML с прежним блоком, шестью регионально согласованными карточками и независимыми изображениями из проверенного pack, без запроса к отказавшим сервисам на пути LKG. До перечисленных доказательств это проект, а не гарантия уже работающего production.
