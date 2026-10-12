# Проверка фундамента CMS

Дата: 12.10.2026. Ветка `codex/payload-cms-foundation`, создана от `origin/main`
`0e992714995b4daaf93e86a2cca1b7847b06a175`. Push, merge и deployment не выполнялись.

## Пройденные проверки

| Проверка | Результат |
| --- | --- |
| Независимая установка CMS | npm ci с собственным package-lock.json успешно |
| CMS TypeScript | npm run typecheck успешно |
| CMS ESLint | npm run lint успешно, без предупреждений |
| CMS unit/security tests | 9 тестов успешно |
| CMS production build | Next.js 16.4.0 standalone успешно, без рабочей БД и настоящих секретов |
| Публичный сайт TypeScript | Успешно |
| Публичный сайт production build | Next.js 16.3.0 успешно, существующие маршруты сохранены |
| PostgreSQL | Реальное подключение к отдельной временной PostgreSQL 17.11 на 127.0.0.1 |
| Первоначальная схема | Миграция применена, запись initial/batch=1 проверена |
| Авторизация / ACL / блокировка | Интеграционный REST-сценарий на настоящей PostgreSQL прошёл |
| Bootstrap CLI | Первый запуск создаёт один super-admin, повторный выходит с кодом 1 и не заменяет аккаунт |
| Admin root | GET / возвращает 200, русское фирменное название присутствует |
| Liveness по HTTP | GET /api/health возвращает 200 и только {"status":"ok"} |
| Первичная HTTP-регистрация | POST /api/users/first-register возвращает 403 даже до bootstrap |
| Изоляция | git diff origin/main по src/, public/, package.json, package-lock.json, next.config.ts и Dockerfile пуст |
| Корневой standalone | Не содержит каталога CMS |
| Linux Docker runner / operations | Обе стадии успешно собираются независимо |
| CMS-контейнер | Запущен с отдельным PostgreSQL 17.10 в приватной Docker-сети |
| Runtime-пользователь | node, UID 1000 |
| Runtime-файлы | Нет /app/src, /app/public, /app/scripts, /app/.env |
| Docker healthcheck | healthy, HTTP health 200 |
| Docker CLI | Миграция и первый bootstrap успешны; повторный bootstrap отказал |
| REST против контейнера | 1 интеграционный сценарий успешно, 0 failed, 0 skipped |
| SIGTERM | docker stop завершил процесс штатным для Next.js кодом 143, без OOM/SIGKILL |
| Работающий публичный сайт | new.avgst.ru/api/health: 200; Dokploy site/main остаётся done |

Интеграционный сценарий проверяет пустую БД, отказ анонимному созданию Users,
запрет повторного bootstrap, вход super-admin, создание admin/editor/viewer,
запрет создания пользователей непривилегированной ролью, отсутствие
повышения роли при PATCH собственного аккаунта, запрет изменения чужого,
разрешённое чтение Media, отказ после блокировки и недействительность старого
JWT. Ответ входа не содержит password/hash/salt/resetPasswordToken. Дополнительно
проверены HttpOnly/Secure/SameSite=Strict cookies, отказ password-reset без SMTP
и отказ правильному паролю после пяти неудачных попыток входа.

Runner использует стандартный Node.js `--test-force-exit`; БД закрывается в
finally до завершения теста. Bootstrap явно завершает отдельный CLI-процесс
после payload.destroy(), как официальный Payload CLI.

## Проверка Docker

Docker успешно собрал окончательные runner и operations с независимым context
около 500 KiB; Next.js build внутри Linux-образа завершился успешно. Публичные
изображения в context отсутствуют. Runner запущен на localhost:3104, operations
применил миграцию в отдельной PostgreSQL и создал первый аккаунт в другой
одноразовой БД. Bootstrap не создаёт второго пользователя. Интеграционный
сценарий проверен против Linux runner, а не только Windows standalone.

Во время первоначальной сборки Docker Desktop Engine аварийно завершился с
SIGBUS. После восстановления Engine обе сборки и runtime-проверки повторены
успешно. Сброс Docker и удаление его пользовательских данных не выполнялись.

Рабочие production-службы не изменялись. Все тестовые порты привязывались к
127.0.0.1; PostgreSQL использовал tmpfs. Временные контейнеры/сеть и локальная
БД удалены после проверки. QA-образы названы `avgst-cms:qa-foundation` и
`avgst-cms:qa-operations`; они не предназначены для публикации.

## Существующая ошибка фронтенда

Корневой ESLint: 1 ошибка и 21 предупреждение. Ошибка:
`src/components/manufacture-video-review.tsx:17`, неиспользуемый `current`.
Файл совпадает с origin/main и не изменялся в задаче. Исправление исходного
фронтенда запрещено условиями, поэтому ошибка оставлена. TypeScript и
production build публичного сайта прошли независимо от неё.

## Аудит зависимостей

Выбранный первоначально Next.js 16.3.3 заменён совместимым 16.4.0; критическая
уязвимость Next.js устранена в зависимостях CMS. Для undici добавлен совместимый
override ^7.29.1 (lock: 7.30.0), исключающий известные уязвимые версии.

`npm audit --omit=dev`: 0 critical, 5 high, 5 moderate, 2 low, всего 12 записей.
Часть записей относится к одной уязвимости и цепочке зависящих пакетов:

- High: braces через sass/chokidar официальных Payload-пакетов. Registry
  предлагает несовместимый откат Payload Lexical на 0.x; он не применялся.
- Moderate: старый esbuild в инструментальной цепочке drizzle-kit /
  @esbuild-kit, транзитивно у PostgreSQL adapter. Npm не предлагает совместимое
  исправление этой цепочки.
- Low: DOMPurify через monaco-editor в официальном UI. Совместимый npm audit
  fix не убрал advisory в доступном наборе зависимостей.

Полный аудит с devDependencies: 16 записей, включая цепочку braces в ESLint.
Не выполнялись несовместимый npm audit fix --force, откат Payload или скрытие
advisories. Перед production оператору нужно повторить аудит и принять решение
по совместимым обновлениям официальных пакетов. Отчёт не утверждает, что все
зависимости свободны от уязвимостей.

## Production пока не опубликован

Перед публикацией повторно проверено приложение Dokploy: idle, Dockerfile,
build path `/cms`, context `cms`, stage `runner`, autoDeploy выключен.
Оператор создал отдельную PostgreSQL с базой `main_app` и выбрал `postgres:18.6`.
Повторно пройдены TypeScript, ESLint и все 9 тестов безопасности CMS.
На отдельной локальной PostgreSQL 18.6 успешно применена исходная миграция и
пройден интеграционный сценарий против Linux runner: bootstrap, REST,
авторизация, роли, блокировка и health. Рабочая БД этим тестом не затрагивалась.
Миграция и bootstrap целевой базы ещё требуют серверного терминала.
Защищённый gateway/VPN, домен и постоянное хранилище медиа остаются отдельными
настройками. Публичная CMS до внешнего шлюза запрещена.
SMTP, S3 и серверная интеграция с сайтом отсутствуют.

Базовое приложение, независимость сборок и контейнер проверены. Настройка и
проверка целевого production-развёртывания остаются отдельными необходимыми шагами.
