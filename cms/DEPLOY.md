# Деплой готового образа CMS

GitHub Actions собирает CMS при изменениях `cms/**` в `main` и публикует
`ghcr.io/nikita-yakuschenko/avgst-cms:latest`. Изменения публичного сайта
не запускают сборку CMS. Кеш слоёв хранится в GitHub Actions.
Checkout получает только папку CMS через sparse checkout.

## Один раз переключить существующее приложение Dokploy

1. Дождаться зелёного workflow **CMS image** в Actions репозитория `site`.
2. В существующем приложении `avgst-payload-bob7vj` открыть **General → Provider**
   и выбрать **Docker** вместо **Git / Custom**.
3. В поле **Docker Image** указать
   `ghcr.io/nikita-yakuschenko/avgst-cms:latest`.
4. Для приватного пакета указать Registry URL `ghcr.io`, GitHub username
   `nikita-yakuschenko` и PAT classic с `read:packages` в поле Registry Password.
   Токен хранить только в Dokploy, не в репозитории.
   Для публичного пакета авторизация не нужна; видимость пакета изменяется
   отдельно в GitHub Packages → avgst-cms → Package settings.
5. Сохранить Provider и нажать **Deploy**. Использовать существующее приложение:
   его Environment, домен, приватная сеть и media mount должны сохраниться.

Следующие обновления: дождаться успешного **CMS image**, затем нажать **Deploy**
в Dokploy. Сервер получает готовый образ, не клонирует Git и не запускает npm.
Docker загружает недостающие слои; изменившийся слой приложения всё равно
нужно скачать. Этот workflow не вызывает деплой Dokploy автоматически.

Для отката заменить `latest` на `sha-<полный SHA нужного коммита>` и выполнить
Deploy. Миграции остаются отдельной операцией; runner их не запускает.

Источник: https://docs.dokploy.com/docs/core/providers
