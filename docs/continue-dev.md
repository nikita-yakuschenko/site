# Продолжение разработки на другом компьютере

Документ для человека и для агента. Агент: прочитай целиком, выполни раздел «Подъём окружения», затем сверься с разделом «Состояние работы» и «Правила».

## Что где лежит

| Что | Где | В git? |
| --- | --- | --- |
| Код сайта (Next.js, порт 3000) | `D:\site` | да |
| Код CMS (Payload 3 на Next, порт 3001) | `D:\site\cms` | да |
| База CMS | Docker-контейнер `avgst-cms-postgres` (Postgres 17, порт 5433, база `avgst_cms`, пользователь `avgst`, том `avgst-cms-pgdata`) | нет |
| Загруженные фото CMS | `D:\site\cms\media` (≈11 МБ) | нет |
| Секреты | `D:\site\.env`, `D:\site\cms\.env`, `D:\site\cms\.env.local-admin` | нет |

Проекты, цены, фото и пользователи админки живут только в базе и в `cms\media`. Через `git pull` они не переносятся.

## Что взять с собой со старого компьютера

Папка `D:\site-transfer` (создана 14.10.2026, вне репозитория):

- `avgst_cms.dump` — дамп базы CMS (формат `pg_dump -Fc`);
- `cms-media.zip` — архив `cms\media`.

Плюс значения из `D:\site\cms\.env` и `D:\site\cms\.env.local-admin` (пароли и ключи, через git их не передавать). Если файлы не взяты — см. «Если секретов нет».

Пересоздать перенос на старом компьютере:

```powershell
New-Item -ItemType Directory -Force D:\site-transfer | Out-Null
docker exec avgst-cms-postgres pg_dump -U avgst -d avgst_cms -Fc -f /tmp/avgst_cms.dump
docker cp avgst-cms-postgres:/tmp/avgst_cms.dump D:\site-transfer\avgst_cms.dump
docker exec avgst-cms-postgres rm /tmp/avgst_cms.dump
Compress-Archive -Path D:\site\cms\media\* -DestinationPath D:\site-transfer\cms-media.zip -Force
```

## Подъём окружения (PowerShell)

Нужны: Git, Node.js (LTS), Docker Desktop.

1. Код:

   ```powershell
   git clone https://github.com/nikita-yakuschenko/site.git D:\site   # или: cd D:\site; git pull
   cd D:\site; npm install
   cd D:\site\cms; npm install
   ```

2. Секреты. Скопировать `D:\site\cms\.env` и `D:\site\cms\.env.local-admin` со старого компьютера. Для сайта создать `D:\site\.env` по образцу `.env.example`.
   Обязательно: **одинаковый** `CMS_SITE_API_KEY` (не короче 32 символов) в `D:\site\.env` и `D:\site\cms\.env`. Без него сайт получает из CMS пустой список проектов и страницы проектов (и превью в админке) отдают 404.

3. База:

   ```powershell
   # пароль взять из DATABASE_URL в cms\.env
   docker run -d --name avgst-cms-postgres -p 5433:5432 -e POSTGRES_DB=avgst_cms -e POSTGRES_USER=avgst -e POSTGRES_PASSWORD=<пароль> -v avgst-cms-pgdata:/var/lib/postgresql/data --restart unless-stopped postgres:17-alpine
   docker cp D:\site-transfer\avgst_cms.dump avgst-cms-postgres:/tmp/avgst_cms.dump
   docker exec avgst-cms-postgres pg_restore -U avgst -d avgst_cms --clean --if-exists --no-owner /tmp/avgst_cms.dump
   docker exec avgst-cms-postgres rm /tmp/avgst_cms.dump
   ```

4. Медиа:

   ```powershell
   Expand-Archive D:\site-transfer\cms-media.zip -DestinationPath D:\site\cms\media -Force
   ```

5. Миграции (догоняют схему, если в git появились новые):

   ```powershell
   cd D:\site\cms; npx payload migrate; npx payload migrate:status
   ```

   С 14.10.2026 вечера история миграций схлопнута. На уже заполненной базе стартовая `20261014_074208_initial_record_ids` не выполняется повторно: её отмечают применённой (`cms/scripts/mark-initial-migration.mjs`), затем `npx payload migrate` догоняет остальные. Последняя — `20261014_164500_product_code`: числовой ключ записи остаётся как есть, у проекта появляется отдельный код товара (8 символов, 6 букв и 2 цифры). Чистая база поднимается всеми миграциями подряд, без скрипта отметки.

6. Запуск — два терминала:

   ```powershell
   cd D:\site\cms; npm run dev   # http://localhost:3001 — админка (адреса вида /collections/projects/8)
   cd D:\site; npm run dev       # http://localhost:3000 — сайт
   ```

7. Проверка: `http://localhost:3000/catalog/barnhouse-113` отвечает 200, в админке у «Барнхаус 113» (`/collections/projects/8`) работает превью справа.

### Если секретов нет

- `CMS_SITE_API_KEY`: сгенерировать новый и прописать одинаково в оба `.env`:
  `-join ((48..57)+(97..102) | Get-Random -Count 64 | % {[char]$_})`
- `PAYLOAD_SECRET`: любой новый длинный случайный ключ (старые сессии станут недействительны — это нормально).
- `DATABASE_URL`: `postgresql://avgst:<пароль>@localhost:5433/avgst_cms` с паролем, выбранным при `docker run`.
- Без дампа база будет пустой: после `npx payload migrate` данные придётся импортировать скриптами `npm run bootstrap` / `npm run import:site` в `cms`.

## Состояние работы (на коммит после 6440cc3)

Цель проекта: публичный сайт выглядит как прежде, контент переезжает в Payload CMS, админкой пользуются не программисты. Админка — на каноничных компонентах shadcn/ui (иконки `@tabler/icons-react`, lucide в проекте нет).

Сделано в карточке проекта (`cms/src/collections/Projects.ts`):

- **Рендеры фасадов / Рендеры интерьеров** — единый список-галерея (`ProjectImageUpload.tsx` → `GalleryBatchUpload`): блок «Перетащите фото сюда» первым, drag-and-drop смены порядка с анимацией, счётчик в заголовке секции.
- **Планировки** — варианты «Вариант А/Б/В…» и этажи «1 этаж / 2 этаж» именуются автоматически (`config/project-plans.ts`), вложенные карточки, экспликация — shadcn-таблица (`RoomsTable.tsx`).
- **Построенные дома** — тот же список, что у рендеров, плюс поле «Подпись» и иконка типа записи. Видео (VK или Kinescope) добавляется кнопкой «Добавить видео» справа от блока загрузки через диалог; клик по видео открывает плеер (`ImagePreviewOverlay.tsx`). Логотип VK — из футера сайта (`VkLogo.tsx`).
- **Комплектации** — shadcn-аккордеоны вместо `details/summary` (`ProjectConfigurationSummary.tsx`). Тексты общие, редактируются в блоке «Комплектации».
- **Цены** — новый раздел под «Комплектациями» (`ProjectPricesEditor.tsx`): по каждой комплектации — Москва, Нижний Новгород, Спеццена, Дилер. Значение сохраняется сразу при выходе из поля в коллекцию `project-prices` (её же наполняет импорт Excel/CSV). Спеццена и Дилер на сайт не отдаются (`config/price-kinds.ts`, фильтр в `project-catalog-endpoint.ts` и `project-configurations-endpoint.ts`).

Открытые вопросы и идеи:

- В режиме превью «Блок отдельно» часть блоков пишет «Этот компонент ещё не подключён к изолированному превью».
- У добавленного видео нельзя изменить ссылку — только удалить и добавить заново (можно добавить кнопку-карандаш).
- На боевом сервере (Dokploy) должен быть задан одинаковый `CMS_SITE_API_KEY` у сайта и CMS, и выполнена миграция `price_kinds`.

## Правила работы

- Отвечать по-русски, команды — для Windows PowerShell.
- Коммиты и пуш — только по просьбе. **Никаких трейлеров соавторства** (`Co-authored-by` и подобных) в коммитах. После коммита проверить: `git log -1 --format="%(trailers)"` должен быть пустым.
- Не коммитить `.env*`, `cms/.env.local-admin`, `.next`, `cms/media`, дампы базы.
- Не выводить пароли и ключи в чат и в логи.
- При проверках в браузере не сохранять формы проектов; не удалять медиафайлы с id 1, 5, 6.
- После правок CMS: `cd D:\site\cms; npx tsc --noEmit -p .`; при изменении компонентов админки — `npx payload generate:importmap`; при изменении схемы — `npx payload migrate:create <имя>` и `npx payload migrate`.
- Если dev-сервер не подхватил `custom.css`: временно добавить пустую строку между `import './custom.css'` и `import './tables.css'` в `cms/src/app/(payload)/layout.tsx`, подождать пересборку и вернуть как было (в коммит эта правка не должна попасть).
- Фирменный стиль сайта: без декоративных надзаголовков над заголовками секций; заголовки — существующие `.section h1/h2`; термин «Ручная стройка».
