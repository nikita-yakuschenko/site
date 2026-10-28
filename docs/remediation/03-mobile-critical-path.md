# Мобильная загрузка: CSS и отложенное подтверждение формы

28 октября 2026 года. Продолжение исправлений по поручению пользователя. Основной production URL для проверок — **https://avgst.ru/**. Отчёт с new.avgst.ru, переданный ранее, не используется как исходный production-замер этого выпуска.

## Исходное состояние

Контрольный [PageSpeed для avgst.ru](https://pagespeed.web.dev/analysis/https-avgst-ru/ggishqy936?form_factor=mobile), 28.10.2026 16:10 Europe/Moscow: mobile score **88**, FCP **1,4 с**, LCP **3,6 с**, TBT **120 мс**, CLS **0** (Lighthouse 13.5.0). Отдельно показанные полевые показатели за 28 дней уже проходили CWV: LCP 2 с, INP 160 мс, CLS 0,01; это исторические данные, не результат новых исправлений.

В общей таблице стилей находились правила каталога, карточки проекта, производства, страницы о компании, калькулятора и документов. Стиль и JS анимации успешной отправки также попадали в начальную загрузку, хотя до подтверждения сервера она не отображается.

## Изменения

- Каталог и карточка проекта подключают свои правила через `catalog/layout.tsx`; производство и about — через страницы. Калькулятор, макет проекта, блок company-bento и правила документов подключают свои CSS в соответствующих компонентах.
- Общие правила, которые действительно используются несколькими разделами, сохранены общими. В частности, hero/breadcrumbs, HistoryPhotoCarousel и смешанные селекторы FAQ не привязаны к одному маршруту. Shared company-bento подключается в обоих использующих его разделах.
- Декларации, медиазапросы и набор селекторов при переносе сохранены. [Проверка состава правил](mobile-critical-path/css-extraction.json).
- FormSuccessAnimation загружает анимацию и её CSS после успешной отправки. Подтверждение видно сразу, включая случай ошибки загрузки необязательного JS chunk. Проверки captcha и серверного receipt сохранены.
- Добавлен критический браузерный тест: начальный CSS главной не должен содержать выбранные уникальные правила других разделов, общий декодированный CSS ограничен **160 000 байт**. Это ограничение размера, не обещание фиксированного Lighthouse score.

## Локальная проверка

Production build выполнен отдельно в `D:/site-remediation-20261028`, исходная рабочая копия не использовалась для prebuild. TypeScript и ESLint изменённых файлов проходят (сохранилось предупреждение о существующем img внутри анимации).

- Сравнение CSS-свойств на 10 маршрутах и ширинах 390/1440: **20/20**, различий в проверяемых свойствах нет. Проверяются в том числе типографика, цвета, отступы, grid/flex и ограничения размеров. Typed OM сохраняет значение `auto` вместо нестабильного разрешённого flex-отступа; это сравнение CSS, не попиксельная визуальная приёмка всех состояний.
- Проверки CSS-бюджета, ленивой анимации и принятого receipt при отказе animation chunk в Chromium desktop/mobile: **6/6**.
- Закрытые формы и отсутствие успешной отправки не запрашивают CSS анимации. После контролируемого receipt отдельная CSS-таблица применена, а её URL отсутствует в исходных таблицах страницы.

## Пять локальных Lighthouse до и после

Lighthouse **12.8.2** установлен изолированно в `output/perf-tools`, без изменения зависимостей и lockfiles приложения. Один host, Chromium Playwright, мобильный viewport 390×844, simulated throttling. Использован fixture production build; сторонние счётчики и записывающие URL заблокированы. Эти оценки нельзя численно сопоставлять с Google Lighthouse 13.5.0 и настоящими CMS-данными.

Начальный CSS по сети: **45 447 → 29 281 байт (−35,6%)**, одинаково во всех пяти прогонах каждой серии. Начальный JS практически не изменился: общий клиентский граф всё ещё содержит формы и общие данные. Вынос анимации уменьшает обязательную работу и число блокирующих CSS-ресурсов, но не объявляется полным исправлением клиентского JS.

Медианы остальных метрик и ограничения сохранены в [сводке](mobile-critical-path/comparison.json). Simulated LCP на локальных fixtures нестабилен и даёт большие расхождения с observed LCP, поэтому снижение production LCP по этой серии не заявляется. Основная доказанная экономия — CSS; окончательная проверка — новый PageSpeed именно для avgst.ru после выпуска.

Команда воспроизведения:

```powershell
npm install --prefix output/perf-tools --no-package-lock --ignore-scripts lighthouse@12.8.2
node scripts/measure-mobile-critical-path.mjs D:/site-remediation-20261028 D:/site/output/perf-tools/node_modules D:/site/docs/remediation/mobile-critical-path before
# Собрать изменённую версию отдельно, затем:
node scripts/measure-mobile-critical-path.mjs D:/site-remediation-20261028 D:/site/output/perf-tools/node_modules D:/site/docs/remediation/mobile-critical-path after
```

Raw Lighthouse JSON и подробные CSS-снимки остаются локальными диагностическими артефактами.

## Выпуск и проверка production

Код опубликован в `main`, коммит `bd6a7c486dc1d7455fa4858d0d5ff35e2140ef6d`. [Полный CI 40697852171](https://github.com/nikita-yakuschenko/site/actions/runs/40697852171) прошёл: 100 браузерных регрессий, 30 критических сценариев, проверки и сборки сайта/CMS. CMS не выкатывалась, миграции не запускались.

Dokploy deployment `HorI2C7muz6UhKMWJoXVp` завершён успешно 28.10.2026 в **16:53:17 Europe/Moscow**. В процессе Dokploy заменил заданное название deployment на сообщение Git-коммита; поэтому итоговый статус проверен по deployment ID и времени, а не по исходному названию.

Production build ID: `0d205983777586cf33bc5f289e288f717d464d05fcd35ba0078539b8f186b916`. Проверка на **https://avgst.ru/**: health/readiness/availability/главная/privacy/каталог/карточка — 200, неизвестный проект — 404. В desktop/mobile начальный CSS — **143 383 декодированных байта**, бюджет 160 000 соблюдён. Переход из каталога в проект сохраняет документ, Back работает, необработанных browser exceptions нет. [Smoke JSON](mobile-critical-path/production-after.json).

Контрольный PageSpeed после выпуска запущен 28.10.2026 в 17:00 Europe/Moscow для **avgst.ru**: [отчёт](https://pagespeed.web.dev/analysis/https-avgst-ru/y8l6ht63kd?form_factor=mobile).

Первый результат после CSS-выпуска: **80**, FCP 1,4 с, LCP 3,9 с, TBT 300 мс, CLS 0; console audit дополнительно зафиксировал timeout `privacy-cs.mail.ru`. Повторный [замер в 17:03](https://pagespeed.web.dev/analysis/https-avgst-ru/ud8scl77ue?form_factor=mobile): **86**, FCP 1,4 с, LCP 4 с, TBT 70 мс, CLS 0. Сокращение CSS подтверждено, но рост итогового production score или улучшение LCP этими замерами **не подтверждены**.

## Дополнительная работа с JavaScript

One2Click выполняет заметную работу в главном потоке (в первом production-замере t.js около 212 мс). Его подключение переведено с раннего async-тега на стандартный Next Script `afterInteractive`: после начала гидратации, без таймеров, ожидания согласия или пользовательского клика. Идентификатор сайта и загрузка при открытии документа сохранены. Остальные счётчики в этом изменении не перенастраиваются.

Локальные проверки CSS-бюджета и инициализации записи сессий — **4/4** в Chromium desktop/mobile: скрипт исполняется после маркера гидратации, получает исходный data-site и не запускается повторно при клиентском переходе. Новый сценарий включён в critical browser gate.

Изменение опубликовано в `main`, коммит `38753c5927efa0ca5c6ecb632b48571547663bc9`. [CI 40704447608](https://github.com/nikita-yakuschenko/site/actions/runs/40704447608) прошёл: **100/100** браузерных регрессий и **35/35** критических сценариев. Deployment `n0Z31VpCb0Z4Z3TlndWzS` завершён 28.10.2026 в **17:35:52 Europe/Moscow**, статус done.

Итоговый production build ID: `3d4d025aac36e3500c2012b218b70b0b41e1dde5f98c74e3c1b4b3a9e35958c0`. Повторный [smoke](mobile-critical-path/production-after.json) прошёл на avgst.ru: endpoints/страницы 200, истинный 404 сохранён, CSS 143 383 декодированных байта, desktop/mobile navigation sameDocument и Back работают, browser exceptions нет. Предыдущий smoke CSS-выпуска сохранён отдельно в [production-css-release.json](mobile-critical-path/production-css-release.json).

Замер после изменения инициализации One2Click: [PageSpeed avgst.ru, 17:36 Europe/Moscow](https://pagespeed.web.dev/analysis/https-avgst-ru/t7dzw4c0ti?form_factor=mobile).

Результат изменения One2Click неудовлетворителен: первый замер — **76**, FCP 1,4 с, LCP 3,8 с, TBT 460 мс. [Повторный замер в 17:45](https://pagespeed.web.dev/analysis/https-avgst-ru/xkdfnimx2d?form_factor=mobile) — **78**, FCP 1,4 с, LCP 3,8 с, TBT 400 мс, CLS 0. Причинность всех колебаний не установлена, но оснований сохранять изменение ради производительности нет.

Перенос One2Click отменён: layout и диагностический сценарий возвращены точно к версии `bd6a7c4`, прошедшей CI 40697852171. Проверка `git diff bd6a7c4 -- src diagnostics` пуста, ESLint проходит. Оптимизация CSS и ленивое подтверждение формы сохранены. Задача улучшения итогового мобильного PageSpeed остаётся незавершённой.

Откат опубликован в main коммитом `ce43def1f05783f2f51c9fb5fd5d01fe62046200`. Deployment `nf1aWdCAqNQpHMYZ0p89q` завершён успешно 28.10.2026 в **17:54:11 Europe/Moscow**. Production build ID снова `0d205983777586cf33bc5f289e288f717d464d05fcd35ba0078539b8f186b916`, как у проверенного CSS-выпуска. Smoke после отката прошёл: health/readiness и страницы 200, неизвестный slug 404, CSS-бюджет соблюдён, desktop/mobile переходы и Back работают, browser exceptions отсутствуют. HTML непосредственно содержит прежний async script One2Click с исходным data-site. Доказанного улучшения итогового PageSpeed нет; этап не объявляется завершённым.
