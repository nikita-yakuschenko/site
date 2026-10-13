<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Фирменный стиль

Не использовать декоративные надзаголовки: короткие слоганы или подписи мелким цветным текстом над основным заголовком секции. Секции начинаются с основного заголовка без такой дополнительной строки.

Для новых секций использовать существующую типографику `.section h1` и `.section h2` (24–30 px). Не вводить увеличенные размеры заголовков по референсу. Перед изменениями сверяться с аналогичными блоками проекта.

В инфографике использовать термин «Ручная стройка» вместо «Ручное строительство».

## Cursor Cloud specific instructions

Node.js 22 уже установлен. PostgreSQL 16 входит в базовый снимок: роль `ubuntu`, база `avgst_cms`, вход с этой машины без пароля.

Зависимости ставятся дважды одной и той же командой: `npm ci` в корне и `npm ci --prefix cms`.

При каждом запуске окружение поднимает PostgreSQL, один раз записывает локальные секреты в `~/.config/avgst/dev.env` и заново собирает из них корневой `.env` и `cms/.env`. Затем в `cms/` выполняется `npm run migrate`. Первый суперадминистратор создаётся только на пустой таблице пользователей, почта `dev@avgst.local`; пароль остаётся в файле секретов. Сайт слушает порт 3000, CMS — порт 3001. Пока способ отправки заявок не переключён вручную, локальная доставка работает в режиме `test`.

Проверки: в корне `npm run typecheck` и `npm run build`; в `cms/` — `npm run typecheck`, `npm run lint` и `npm test`. Сборка CMS идёт с `NODE_ENV=production`, поэтому HTTP-адрес из локального `.env` для неё не подходит. Её запускают так: `CMS_PUBLIC_URL=https://cms.avgst.ru npm run build`. Корневой `npm run lint` сейчас завершается ошибкой из-за уже существующих замечаний в репозитории. Файл `next-env.d.ts` сайта создаёт Next.js; без него проверка типов не видит импорты PNG.

Живость: `http://localhost:3000/api/health` и `http://localhost:3001/api/health`.
