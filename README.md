# Авангард Строй 4.0 — новый сайт

Ветка `av4` — чистый старт нового сайта. Ветка `main` содержит предыдущую версию и
в этой работе не участвует.

## Контур

| Слой | Где | Что |
| --- | --- | --- |
| Задачи | [YouTrack AV4](https://tracker.avgst.ru/projects/AV4) | этапы, задачи, DoD |
| Код | `github.com/nikita-yakuschenko/site`, ветка `av4` | orphan-история |
| Деплой | Dokploy, проект `avgst-4.0-new-site`, приложение `avgst-4-site` | автодеплой по push |
| Адрес | https://new.avgst.ru | HTTPS, Let's Encrypt |

Основание архитектуры — ADR [WEB-6](https://tracker.avgst.ru/issue/WEB-6):
Next.js + Payload CMS + PostgreSQL. Слой CMS подключается в этапе
[AV4-2](https://tracker.avgst.ru/issue/AV4-2), сейчас в ветке только каркас приложения.

## Запуск

```bash
npm install
npm run dev
```

Открыть http://localhost:3000, проверка состояния — http://localhost:3000/api/health.

Перед коммитом:

```bash
npm run typecheck && npm run lint
```

## Доставка

Push в `av4` запускает сборку в Dokploy по `Dockerfile` (стадия `runner`,
`output: standalone`). Новая версия поднимается рядом со старой в режиме
`start-first`. Пока healthcheck `/api/health` не ответит 200, трафик на неё
не переключается; при неудаче происходит откат на предыдущую версию.

Ручных действий в интерфейсе Dokploy не требуется.

## Правила работы

1. Нет задачи в AV4 — нет ветки. Работа ведётся от `av4`, ветка
   называется `av4/AV4-NN-краткое-имя`.
2. Ключ задачи стоит в первой строке коммита: `AV4-12: токены бренда`.
3. В `main` изменения из этой ветки не переносятся до cutover
   ([AV4-6](https://tracker.avgst.ru/issue/AV4-6)).
4. Секреты живут в переменных окружения приложения в Dokploy, в репозиторий
   не попадают. Локальные значения — в `.env`, он в `.gitignore`.

## Переменные окружения

См. `.env.example`. На текущем этапе приложению не нужна база: каркас
поднимается без внешних зависимостей. `DATABASE_URI` появится вместе с
PostgreSQL в [AV4-9](https://tracker.avgst.ru/issue/AV4-9).
