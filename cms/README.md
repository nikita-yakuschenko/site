# Payload CMS: Авангард Строй 4.0

Самостоятельное приложение внутри репозитория сайта. Административная панель
на `/`, REST API на `/api`, минимальный liveness на `/api/health`. Публичный
фронтенд постепенно подключается к CMS по отдельным блокам. CMS не копирует
исходники фронтенда.

## Структура

```text
cms/
  src/app/(payload)/       официальные RootLayout, RootPage и REST handlers
  src/app/api/health/      проверка процесса без подключения к БД
  src/access/             роли, актуальные права, безопасный bootstrap
  src/collections/        Users и Media
  src/components/         стандартное брендирование Payload
  src/config/             проверка обязательного окружения
  src/migrations/         исходная миграция и snapshot PostgreSQL
  src/payload.config.ts   отдельная конфигурация CMS
  src/payload-types.ts    типы, созданные Payload
  scripts/bootstrap.ts    первый суперадминистратор через инфраструктурную CLI
  tests/                  проверки безопасности и интеграционный сценарий
  Dockerfile              runner и отдельная maintenance-стадия operations
  .dockerignore
  .env.example
  package.json / package-lock.json
  next.config.ts / tsconfig.json / eslint.config.mjs
```

Приложения изолированы: корневой `tsconfig.json` исключает `cms`, ESLint
игнорирует `cms/**`, корневой Docker context сайта исключает `cms`; CMS использует собственный `Dockerfile.dockerignore` и получает общие модули из `src/lib`. Пакеты, сборка
и runtime CMS независимы от фронтенда.

## Версии

| Пакет | Версия |
| --- | --- |
| payload | 3.90.2 |
| @payloadcms/next | 3.90.2 |
| @payloadcms/db-postgres | 3.90.2 |
| @payloadcms/richtext-lexical | 3.90.2 |
| @payloadcms/ui | 3.90.2 |
| @payloadcms/translations | 3.90.2 |
| next | 16.4.0 |
| react / react-dom | 19.2.6 |
| graphql | 16.11.0 |
| sharp | 0.35.5 |
| TypeScript | 5.7.3 |
| eslint / eslint-config-next | 9.39.4 / 16.4.0 |
| tsx | 4.21.0 |
| @types/node | 22.19.9 |
| @types/react / @types/react-dom | 19.2.14 / 19.2.3 |

Все официальные Payload-пакеты имеют одну версию. Next.js 16.4.0 соответствует
peer range `@payloadcms/next`; публичный сайт продолжает использовать свои
версии. GraphQL нужен официальному пакету, однако GraphQL API отключён.
`tsx` нужен CLI и тестам. Совместимый override `undici ^7.29.1` исключает
уязвимую транзитивную версию, фактические версии фиксирует package-lock.json.
Docker использует Node.js 22 на Debian bookworm, без PostgreSQL внутри образа.

## Подключение главного экрана каталога

`GET /api/projects/hero?slug=...` отдаёт только название, адрес, технологию,
характеристики и адреса двух изображений. Запрос выполняет сервер сайта с
`Authorization: Bearer CMS_SITE_API_KEY`; ключ не передаётся в браузер.
Одинаковый ключ нужно настроить в окружениях CMS и фронтенда. На сайте
`CMS_PUBLIC_URL` должен указывать на доступный ему адрес CMS.

Подключение каждой записи контролирует скрытое поле `heroContentSource`:
`mock` сохраняет данные из исходников, `database` включает главный экран из
CMS. Менять его может только суперадминистратор. `importKey` сохраняет связь с исходным проектом, даже
если адрес записи изменён; старый адрес перенаправляет на новый.

Изображения выбираются штатными upload-полями Payload из коллекции `media`.
Их можно загрузить с компьютера или выбрать в медиатеке. Старые `imageUrl`
и `mobileImageUrl` скрыты и используются только как резерв для ранее
импортированных записей. При отсутствии мобильного изображения используется
десктопное. Анонимно доступны только медиафайлы, выбранные у подключённых
главных экранов, фасадов, интерьеров и построенных домов; остальные файлы требуют авторизации.

Фасады подключаются отдельно через `exteriorsContentSource=database` и
`GET /api/projects/exteriors?slug=...` с тем же серверным ключом. В каждой
строке массива `exteriors` поле `photo` выбирает медиафайл, `isPrimary`
назначает главную фотографию. Звёздочка в заголовке строки переключает
главную фотографию без изменения порядка остальных строк. Главная всегда
выводится первой, в большой ячейке; после её удаления выбирается первая
оставшаяся. При сохранении сервер обеспечивает единственную главную
фотографию. Пустая галерея скрывает блок.

Интерьеры подключаются через `interiorsContentSource=database` и
`GET /api/projects/interiors?slug=...` с тем же серверным ключом. Поле `photo`
в каждой строке `interiors` позволяет загрузить фотографию или выбрать её
из медиатеки. Сайт сохраняет порядок строк. Изменения фотографий и порядка
сразу отображаются в предпросмотре; на публичной странице после сохранения.
Пустой список скрывает блок. Остальные блоки остаются в исходниках.

Построенные дома подключаются через `builtContentSource=database` и
`GET /api/projects/built?slug=...`. Массив `built` содержит записи с типом
`photo` или `video`, в порядке отображения. Для фото используется `photo`
из медиатеки. Для видео выбирается `provider` (Kinescope или VK Видео),
указывается публичная HTTPS-ссылка `videoUrl` и, при необходимости, обложка
в поле `photo`. Ссылка проверяется на соответствие выбранной платформе;
ID ролика и владельца VK определяются автоматически. Произвольные iframe
не принимаются. Несохранённые изменения отображаются в предпросмотре.
Старая группа `builtTour` сохранена скрытой для совместимости данных.
Звёздочка `isPrimary` назначает основную запись: фото или видео. Она занимает
большую ячейку, остальные записи остаются в ленте в заданном порядке.
После удаления основной записи первой оставшейся назначается этот статус.

Для общего блока `ProjectNextSteps` проект хранит только `nextStepsSettings`:
показ блока, показ двух карточек и их порядок. `GET /api/projects/next-steps`
выдаёт эти настройки с тем же серверным ключом. Существующие записи по
умолчанию показывают обе карточки в прежнем порядке. В готовых домах вторая
карточка обозначает обзор дома, в проектах домов консультацию с архитектором.
Тексты и изображения не копируются в настройки проекта.

Для production перед загрузкой файлов необходим постоянный volume на
`CMS_MEDIA_DIR` и `CMS_MEDIA_PERSISTENT=true`. Примените миграции до запуска
обновлённой CMS. Локальные изменения БД и загруженные файлы автоматически
в production не переносятся.

## Окружение

| Переменная | Назначение |
| --- | --- |
| DATABASE_URL | URL отдельной PostgreSQL БД CMS |
| PAYLOAD_SECRET | Случайный постоянный секрет, минимум 32 символа |
| CMS_PUBLIC_URL | Точный внешний origin CMS, production только HTTPS |
| CMS_SITE_API_KEY | Общий серверный секрет CMS и сайта для чтения подключённых главных экранов, минимум 32 символа |
| NODE_ENV | `production` в Docker; Next.js устанавливает локально |
| CMS_MEDIA_DIR | Локально `./media`; production `/app/media` с volume |
| CMS_MEDIA_PERSISTENT | `false` по умолчанию; `true` только после настройки volume |
| PORT / HOSTNAME | Контейнер: `3000` / `0.0.0.0`, уже заданы Dockerfile |

В `.env.example` нет рабочих секретов. Не используйте `.env` публичного сайта.
Не передавайте DATABASE_URL/PAYLOAD_SECRET через NEXT_PUBLIC_*, Docker build args
или параметры команд. Generate/build проверяются с одноразовым случайным
секретом и фиктивным URL БД: настоящие runtime-значения нужны отдельно.
Секрет для runtime генерируется оператором, например `openssl rand -hex 48`,
сохраняется в защищённом менеджере и остаётся постоянным между рестартами.

## Локальная разработка

Из `cms/`:

```sh
npm ci
cp .env.example .env
# заполнить .env: отдельная локальная PostgreSQL, секрет, http://localhost:3001
npm run migrate
npm run bootstrap
npm run dev
```

Перед bootstrap передайте четыре переменные через защищённое окружение:
`CMS_BOOTSTRAP_EMAIL`, `CMS_BOOTSTRAP_PASSWORD`, `CMS_BOOTSTRAP_FIRST_NAME`,
`CMS_BOOTSTRAP_LAST_NAME`. Пароль минимум 16 символов, без известного значения
по умолчанию. `.env` загружается CLI; не храните bootstrap-пароль постоянно
в этом файле. Для Bash пароль можно вводить скрыто через
`read -rs CMS_BOOTSTRAP_PASSWORD; export CMS_BOOTSTRAP_PASSWORD`.
После команды удалите все CMS_BOOTSTRAP_* из shell и конфигурации контейнера.

Bootstrap принимает только пустую коллекцию Users. PostgreSQL advisory lock
сериализует параллельные CLI-запуски. Повторный запуск завершится отказом,
не заменит аккаунт и не изменит пароль существующего пользователя.
HTTP `first-register` запрещён; серверный hook также запрещает анонимное
создание даже при внутреннем `overrideAccess`. До bootstrap стандартный экран
Payload может предложить создать первого пользователя, но отправка формы
всегда запрещена. Первый аккаунт создавайте только через CLI.

## Пользователи и доступ

### Оформление панели

Geist Sans и Geist Mono поставляются локально пакетом `geist`, как на публичном
сайте. Общая тема находится в `src/app/(payload)/custom.css`: семантические
токены shadcn/ui (`background`, `foreground`, `primary`, `border`, `ring` и др.)
связаны с переменными и штатными контролами Payload через `@layer payload`.
Фирменная палитра: ink `#0b1020`, yellow `#fcc90c` для основных действий,
green `#48b062` для состояний успеха. Оболочка основана на shadcn/ui
`dashboard-01`, форма входа — на `login-04`, пустые списки — на `Empty`.
Иконки пользовательских компонентов — Tabler. Логотип формы входа
`public/logo_wp.svg` меняет цвет вместе с темой.
Поддерживаются светлая и тёмная темы, переключатель в верхней панели.
Даты отображаются в формате `dd.MM.yyyy, HH:mm`.
Новые компоненты должны использовать эти токены, Geist, ту же шкалу радиусов
и состояния фокуса. Встроенные формы сохраняют поведение и API Payload.

Users: имя, фамилия, email, роль, блокировка, timestamps, стандартная
аутентификация Payload. Русский интерфейс, фирменное название и часовой пояс
Europe/Moscow; даты в PostgreSQL хранятся как timestamptz.

| Роль | Users | Media |
| --- | --- | --- |
| super-admin | Пользователи, роли, блокировки; нельзя удалить себя | Все действия |
| admin | Только собственный аккаунт, без изменения привилегий | Чтение, создание, изменение, удаление |
| editor | Только собственный аккаунт, без изменения привилегий | Чтение, создание, изменение |
| viewer | Только собственный аккаунт, без изменения привилегий | Чтение |
| Анонимный / заблокированный | Нет доступа | Нет доступа |

Роли проверяются на сервере, по актуальной записи в БД, а не по старым JWT.
Блокировка запрещает вход и удаляет сессии: ранее выданные JWT становятся
недействительными, включая встроенные endpoints Payload. JWT действует 2 часа.
После 5 неудачных попыток входа аккаунт блокируется на 15 минут. Cookies:
HttpOnly (Payload), Secure в production, SameSite=Strict. CORS/CSRF разрешают
только CMS_PUBLIC_URL. Внешний серверный API пока не реализован.

Стандартные password/hash/salt скрывает Payload. Password-reset через почту
запрещён, пока не настроен SMTP: тестовый mail adapter не должен печатать
ссылки восстановления в логи. Суперадминистратор может сменить пароль другого
пользователя в защищённой панели. Не отправляйте пароли в URL или логи.
Локальный API Payload по умолчанию обходит ACL: будущий код с пользовательским
контекстом обязан явно задавать `overrideAccess: false` и передавать `req`.
Только отдельная инфраструктурная CLI сознательно использует обход ACL.

## Медиа

Media: файл, обязательные alt и название, описание, стандартные MIME,
размеры изображения и thumbnail 320x320. Разрешены JPEG/PNG/WebP/AVIF,
файлы до 10 MiB, чтение защищено ACL.

Локально файлы находятся в `cms/media/`, каталог исключён из Git/Docker build.
В production создание, изменение и удаление Media выключены до явного
CMS_MEDIA_PERSISTENT=true и абсолютного CMS_MEDIA_DIR. Значение `true` само
не создаёт volume: оператор обязан проверить mount и права записи UID 1000.
Это не заменяет backup БД и файлов.

Для S3 позже добавляется официальный storage adapter в `plugins` конфигурации
для slug `media`; URL и ACL останутся в коллекции. Сейчас S3 и перенос
публичных изображений не реализованы. Без volume/S3 production-загрузка
не считается готовой.

## PostgreSQL и миграции

Нужна отдельная БД и отдельная учётная запись CMS. В Dokploy используйте
отдельный PostgreSQL-сервис с persistent volume и резервными копиями.
DATABASE_URL берётся из **Internal Connection URL**, включая внутренний
hostname/appName сервиса. Пример формы, без реальных реквизитов:
`postgresql://cms_user:<URL-encoded-password>@<internal-postgres-host>:5432/cms`.
БД и CMS должны быть в одной приватной Docker-сети. Не публикуйте порт 5432.
Не используйте существующие БД других приложений.

Схема создаётся миграцией `src/migrations/20261012_154042_initial.ts`:
Users, sessions, Media и служебные таблицы Payload. JSON snapshot сохраняется
для последующих изменений. `push: false` действует и локально. `prodMigrations`
не задан; старт приложения не применяет миграции и не удаляет схему.
Автоматическое создание отсутствующей БД тоже отключено: её создаёт оператор.

```sh
# отдельная операция перед запуском/обновлением CMS
npm run migrate:status
npm run migrate
```

Новые изменения схемы: изменить коллекцию, `npm run generate:types`,
`npm run migrate:create -- descriptive_name`, изучить SQL, проверить на копии
БД, сделать backup и применить явно. Не используйте migrate:fresh/reset
на рабочей базе. Down исходной миграции удаляет таблицы и данные.

## Docker

Из корня репозитория, context строго `./cms`:

```sh
docker build --target runner -f cms/Dockerfile -t avgst-cms:release ./cms
docker build --target operations -f cms/Dockerfile -t avgst-cms:operations ./cms
```

runner содержит только standalone Next.js и его static assets, слушает 3000,
работает от пользователя node (UID 1000). Exec-form `node cms/server.js` получает
SIGTERM; задайте stop grace period минимум 30 секунд. Healthcheck каждые 30
секунд проверяет GET `/api/health`, timeout 5 секунд, start period 30 секунд,
3 retries. Он проверяет процесс; статус `ok` не доказывает готовность БД.
Перед переключением трафика дополнительно проверьте вход и чтение коллекций.

operations содержит исходники и CLI. Секреты предоставляет оператор через
защищённый env-файл вне репозитория с правами 600 либо secrets manager.
Из каталога с env-файлом, доступным только оператору:

```sh
docker run --rm --network dokploy-network --env-file ./cms.runtime.env \
  avgst-cms:operations npm run migrate:status
docker run --rm --network dokploy-network --env-file ./cms.runtime.env \
  avgst-cms:operations npm run migrate
# cms.bootstrap.env дополнительно содержит четыре CMS_BOOTSTRAP_*; удалить после
docker run --rm --network dokploy-network --env-file ./cms.bootstrap.env \
  avgst-cms:operations npm run bootstrap
```

Имя сети берите из реального окружения. В Docker Swarm сеть для разового
контейнера должна быть attachable; иначе выполните операции отдельной
maintenance-службой в той же overlay-сети. `operations` нельзя выставлять
на домен или использовать как runtime CMS. Миграции не являются CMD runner.

## Настройка существующего приложения Dokploy

Проверено только чтением 12.10.2026: проект `avgst-web-app`, production,
приложение `CMS [Авангард Строй 4.0]`, ID `LIoQDU3ZmcJU98x7xDiOV`,
appName `avgst-payload-bob7vj`. Перед публикацией повторно проверены настройки:
Git/main, Dockerfile, build path `/cms`, context `cms`, stage `runner`,
autoDeploy выключен, домен не задан. Отдельная PostgreSQL уже создана оператором:
`avgstwebapp-db-40-fjpfii`, база `main_app`, выбран образ `postgres:18.6`.
Настройки сборки для дальнейших развёртываний:

| Настройка | Значение |
| --- | --- |
| Repository | https://github.com/nikita-yakuschenko/site.git |
| Branch | main, после отдельного разрешения и merge feature-ветки |
| Git Build Path / customGitBuildPath | /cms |
| Build Type | Dockerfile |
| Dockerfile Path | Dockerfile, относительно выбранного build path |
| Docker Context Path | ., корень Git checkout; `cms/Dockerfile.dockerignore` включает только CMS и общие модули `src/lib` |
| Docker Build Stage | runner |
| Container / Domain Port | 3000, без публикации host-порта |
| Environment | DATABASE_URL, PAYLOAD_SECRET, CMS_PUBLIC_URL=https://cms.avgst.ru, NODE_ENV=production |
| Network | Та же приватная сеть, что у отдельного PostgreSQL CMS |
| Domain | cms.avgst.ru с HTTPS, только после внешнего шлюза/VPN |
| Healthcheck | GET http://127.0.0.1:3000/api/health, параметры из Dockerfile |
| Stop grace period | 30 секунд или больше |
| Media mount | При необходимости persistent volume -> /app/media, UID 1000 |
| Auto deploy | Выключен до завершения первого запуска и явного разрешения |

Перед сборкой проверьте итоговую команду Dokploy: она должна быть эквивалентна
`docker build -f <checkout>/cms/Dockerfile --target runner <checkout>`.
Контекст ограничивает `cms/Dockerfile.dockerignore`, который имеет приоритет над
корневым `.dockerignore`: публичные изображения, локальные секреты и зависимости
не попадают в CMS-образ.
Существующее приложение сайта и его переменные/домен не менять.

Порядок первого запуска:

1. Получить отдельное разрешение на публикацию кода/деплой; исправить настройки CMS.
2. Создать отдельный PostgreSQL, private network, volume и backup; задать окружение.
3. Собрать runner и operations из одного утверждённого коммита.
4. Явно применить миграции operations-образом, проверить migrate:status.
5. Явно выполнить bootstrap с индивидуальными реквизитами; удалить bootstrap env.
6. Запустить runner внутри приватного контура; проверить health, login, ACL, блокировку.
7. Подключить внешний шлюз/VPN и HTTPS-домен; до этого не публиковать админку в интернет.
8. При необходимости настроить/проверить persistent media volume и backup.
9. После проверки решить отдельно, разрешать ли последующие автоматические деплои.

## Последующая интеграция

Публичный Next.js -> внутренний серверный API CMS -> PostgreSQL. Браузер сайта
не должен обращаться к административному REST API. Позднее нужен отдельный
механизм чтения опубликованного контента и отдельная сервисная авторизация,
не пользовательские JWT панели. Каталог, страницы, SEO, 1С, Bitrix24 и
визуальный редактор сейчас не добавлены.

## Проверки и ограничения

```sh
npm ci
npm run typecheck
npm run lint
npm test
npm run build
```

Интеграционный сценарий требует пустой **одноразовой** PostgreSQL БД,
применённых миграций и локального сервера CMS с тем же окружением.
`CMS_TEST_DATABASE=true CMS_TEST_URL=http://127.0.0.1:3001 npm run test:integration`.
Без этих флагов тест явно пропускается, а не имитирует успешное подключение.
Он создаёт тестовые аккаунты; повторный запуск требует другой пустой БД.

Полный фактический результат, оставшиеся зависимости с advisories и
инфраструктурные ограничения указаны в [VALIDATION.md](VALIDATION.md).
Локальные runtime/SQL проверки пройдены. До настройки отдельной production-БД,
внешнего шлюза, окружения и проверки целевого развёртывания приложение нельзя
считать готовым к публичному production-запуску.

Официальные источники: [установка Payload](https://payloadcms.com/docs/getting-started/installation),
[аутентификация](https://payloadcms.com/docs/authentication/overview),
[ACL](https://payloadcms.com/docs/access-control/overview),
[PostgreSQL](https://payloadcms.com/docs/database/postgres),
[миграции](https://payloadcms.com/docs/database/migrations),
[деплой](https://payloadcms.com/docs/production/deployment),
[Dokploy Application API](https://docs.dokploy.com/docs/api/application),
[разрешение путей в Dokploy](https://github.com/Dokploy/dokploy/blob/canary/packages/server/src/utils/filesystem/directory.ts).
