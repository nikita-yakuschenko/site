# Ипотечные лендинги для Тильды (Zero Block)

Четыре самодостаточных HTML без калькулятора, шапки и подвала сайта. Контент совпадает со страницами `family-mortgage` / `it-mortgage` / `agro-mortgage` / `basic-mortgage`.

## Файлы

| Файл | Программа |
|------|-----------|
| `family.html` | Семейная ипотека |
| `it.html` | IT-ипотека |
| `agro.html` | Сельская ипотека |
| `basic.html` | Базовые программы банков |
| `assets/` | Все картинки страниц (persons, cards, series, logos) |
| `shared.css` | Общие стили (уже вшиты в каждый HTML) |
| `build.mjs` | Пересборка из `src/lib/copy.ts` |

## Как вставить в Тильду

1. Создайте страницу → **Zero Block**.
2. Добавьте элемент **HTML** на всю ширину.
3. Откройте нужный `*.html`, скопируйте блок `<div class="zm-page" …>…</div>` **вместе** с тегом `<style>…</style>` из `<head>` (или подключите `shared.css` один раз в **Настройки сайта → HTML-код для head**).
4. Картинки — в `tilda/mortgage/assets/` (~14 MB). В HTML пути вида `assets/persons/family_1.png`. Залейте папку `assets` на Тильду (Файлы / CDN) и при необходимости поправьте префикс пути под ваш URL загрузки.

## Формы

В разметке два слота:

- `#zm-mid-form` — заявка в середине страницы  
- `#zm-contacts` — заявка в блоке контактов  

Внутри `.zm-form-slot` — подсказка. **Удалите подсказку** и вставьте виджет формы Тильды (T123 / Form из Zero Block) на это место. Рекомендуемые поля: имя, телефон.

Кнопка героя «Оставить заявку» ведёт на `#zm-mid-form`.

## Шрифты

Стек: **Geist → Inter → Arial**. Inter подтягивается с Google Fonts. Если Geist уже подключён на сайте Тильды — подхватится сам; иначе страница останется на Inter.

## Ссылки на другие программы

Пока все карточки «Другие ипотечные программы» ведут на `#`. Когда будут URL страниц Тильды — замените `href="#"` у `.zm-program` или пересоберите после правки в `build.mjs` (`PROGRAM_CARDS` / `renderOther`).

## Контакты

Телефон, почта и адрес без карты Яндекса:

- `+7 (831) 266-66-45`
- `avgst@avgst.ru`
- Деловой центр «Ока», проспект Гагарина 27А к1

## Пересборка после правок текстов на сайте

```powershell
cd c:\site
node --experimental-strip-types -e "import { copy } from './src/lib/copy.ts'; import { writeFileSync } from 'fs'; const keys=['familyMortgage','itMortgage','ruralMortgage','marketMortgage','mortgageOtherPrograms']; const out={}; for (const k of keys) out[k]=copy[k]; writeFileSync('tilda/mortgage/_content.json', JSON.stringify(out));"
node tilda/mortgage/build.mjs
```
