# Сайт Авангард Строй

Новый движок публичного сайта завода. Один процесс: **Next.js App Router + Payload CMS 3 + PostgreSQL**.

Живой прод завода пока на **Tilda** (`avgst.ru`). Этот репозиторий — замена, не админка Tilda и не сайт команды Модуль (`SITE` / module.team).

План и паспорт — в YouTrack, проект **`WEB`**: [паспорт](https://tracker.avgst.ru/articles/WEB-A-1) · [ADR](https://tracker.avgst.ru/articles/WEB-A-2) · [доска](https://tracker.avgst.ru/agiles/201-19).

## Как это устроено

Хост запроса выбирает сайт (`Sites`). У сайта есть страницы (`Pages`) из зарегистрированных блоков. Каталог домов пока не из CMS — fixture в коде. Цены в Payload не хранятся.

```text
браузер
  → Host (avgst.ru / localhost / партнерский домен)
  → Sites
  → Pages.layout[]          только REGISTERED_BLOCKS
  → BlockRenderer

/projects, /projects/[slug] → fixture catalog
POST /next/leads            → коллекция leads
/admin                      → Payload
```

Редактор не может вставить произвольный HTML/CSS. Новый блок — сначала `src/blocks`, потом реестр, потом рендер.

Несколько сайтов живут в одной БД: корпоративный, партнёрский, региональный. Партнёр видит только свой tenant (`partnerExternalId`).

## Запуск

Нужны Node 20+ и Docker. Postgres в compose слушает **5433**, чтобы не пересечься с локальным 5432.

```powershell
docker compose up -d
copy .env.example .env
npm install
npm run seed
npm run dev
```

| Что | Адрес |
|---|---|
| Сайт | http://localhost:3000 |
| Админка | http://localhost:3000/admin |
| Каталог | http://localhost:3000/projects |

Первый пользователь создаётся в `/admin` при первом заходе (email + пароль). Seed поднимает:

- сайт `corporate` (localhost, avgst.ru) и опубликованную главную;
- партнёрский `partner-nn` (для проверки tenant);
- черновик `hidden-draft` (не должен открываться без preview).

Секреты только в `.env`. В Git их нет. Без `.env` seed падает: Payload не стартует без `PAYLOAD_SECRET`.

`npm audit fix --force` не запускать: он ломает пины Payload (`sharp` / `vitest`), а дыру `drizzle-kit` внутри `@payloadcms/db-postgres` всё равно не закрывает.

## Где что лежит

```text
src/
  payload.config.ts     CMS: коллекции, БД, i18n
  access.ts             права на сервере
  seed.ts               демо-контент
  collections/          users, media, sites, pages, leads, project-content
  blocks/               схемы блоков + registry.ts
  components/           BlockRenderer, шапка, каталог, форма
  lib/
    host.ts             резолв сайта по Host
    catalog/            fixture проектов
    leads.ts            Zod + rate limit
  app/(frontend)/       публичный сайт
  app/(payload)/        /admin и API Payload
```

Публичные маршруты CMS-страниц — `app/(frontend)/[[...slug]]`. Каталог вынесен отдельно: страницы `/projects` не обязаны жить в Payload.

После смены полей коллекций:

```powershell
npm run generate:types
```

## Коллекции

| Slug | Зачем |
|---|---|
| `sites` | Витрина: домены, навигация, контакты, бренд |
| `pages` | Страницы из блоков, черновики и версии |
| `project-content` | Редакторская обложка проекта (текст/фото). **Не цены** |
| `leads` | Заявки с формы. Публичный create идёт через `/next/leads`, не напрямую в коллекцию |
| `media` | Картинки, диск `./media` (в gitignore) |
| `users` | Роли: `super-admin` / `hq-*` / `partner-*` / `viewer` |

Блоки страницы: `hero`, `popularProjects`, `textSection`, `cta`, `productionSection`, `contactsSection`, `leadForm`, `projectsCatalog`, `faq`.

## Команды

| Команда | Зачем |
|---|---|
| `npm run dev` | разработка |
| `npm run devsafe` | снести `.next` и запустить заново |
| `npm run seed` | идемпотентный сид, можно повторять |
| `npm run typecheck` | TypeScript |
| `npm run test:int` | Vitest (часть тестов нужна живая БД) |
| `npm run test:e2e` | Playwright, сам поднимает `next dev` |
| `npm run build` | продакшен-сборка |

## Чего здесь ещё нет

- Прод этого стека в Dokploy не заведён. Не путать с приложением `site` в панели `dev.module.team` — это `SITE`.
- Каталог домов не связан с Tilda Store / CAT. Ломать Store на Tilda вслепую нельзя: оттуда читает каталог КП.
- shadcn/ui пока не подключён. Публичный UI — кастомный CSS + Geist. Канон ADS — в паспорте.
- `Dockerfile` рассчитан на `output: 'standalone'`, в `next.config.ts` этого нет. Для локальной работы не нужен.
- `/health`, backup и CI появятся перед первым продом.

Стандарты не копировать в репозиторий: [AMS](https://tracker.avgst.ru/articles/ITD-A-1) · [AES](https://tracker.avgst.ru/articles/ITD-A-2) · [ADS](https://tracker.avgst.ru/articles/ITD-A-3).
