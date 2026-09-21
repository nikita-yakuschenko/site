/**
 * Сборка HTML Zero Block из выгрузки copy.ts.
 * Запуск: node tilda/mortgage/build.mjs
 */
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));
const ASSET = "https://new.avgst.ru";
const SITE = {
  phone: "+7 (831) 266-66-45",
  phoneHref: "tel:+78312666645",
  email: "avgst@avgst.ru",
  address: "Деловой центр «Ока», проспект Гагарина 27А к1",
};

const BANKS = [
  { name: "СберБанк", src: "/logos/banks/sber.svg" },
  { name: "ВТБ", src: "/logos/banks/vtb.svg" },
  { name: "ДОМ.РФ", src: "/logos/banks/domrf.svg" },
  { name: "Россельхозбанк", src: "/logos/banks/rshb.svg" },
  { name: "Примсоцбанк", src: "/logos/banks/primsoc.svg" },
  { name: "Центр-инвест", src: "/logos/banks/centr-invest.svg" },
];

const PROGRAM_CARDS = [
  {
    id: "family",
    title: "Семейная ипотека",
    rate: "от 6%",
    image: "/persons/family2.png",
    note: "Для семей с детьми",
  },
  {
    id: "it",
    title: "IT-ипотека",
    rate: "от 6%",
    image: "/persons/it.png",
    note: "Для специалистов IT-компаний",
  },
  {
    id: "rural",
    title: "Сельская ипотека",
    rate: "от 3%",
    image: "/img/cards/wheat.png",
    note: "Для работников АПК и соц. сферы на селе",
  },
  {
    id: "market",
    title: "Базовые программы",
    rate: "от 16%",
    image: "/persons/bank.png",
    note: "Лучшие условия от ведущих банков",
  },
];

const PAGES = [
  {
    file: "family.html",
    id: "family",
    key: "familyMortgage",
    title: "Семейная ипотека — Авангард Строй",
    heroCutout: false,
    midCutout: false,
  },
  {
    file: "it.html",
    id: "it",
    key: "itMortgage",
    title: "IT-ипотека — Авангард Строй",
    heroCutout: true,
    midCutout: true,
  },
  {
    file: "agro.html",
    id: "rural",
    key: "ruralMortgage",
    title: "Сельская ипотека — Авангард Строй",
    heroCutout: true,
    midCutout: true,
  },
  {
    file: "basic.html",
    id: "market",
    key: "marketMortgage",
    title: "Базовые программы банков — Авангард Строй",
    heroCutout: true,
    midCutout: true,
  },
];

const HREF_MAP = {
  "/catalog": `${ASSET}/catalog`,
  "/for-sale": `${ASSET}/for-sale`,
  "/manufacture": `${ASSET}/manufacture`,
  "/#contacts": "#zm-contacts",
};

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function asset(path) {
  if (!path) return "";
  if (/^https?:/i.test(path)) return path;
  return `${ASSET}${path.startsWith("/") ? path : `/${path}`}`;
}

function resolveHref(href, form) {
  if (form) return "#zm-mid-form";
  return HREF_MAP[href] ?? href ?? "#";
}

function formSlot(variant) {
  const label =
    variant === "mid"
      ? "Слот формы Тильды (середина страницы)"
      : "Слот формы Тильды (контакты)";
  return `<div class="zm-form-slot" data-zm-form="${variant}">
  <!-- Вставьте сюда виджет формы Тильды (Zero Block → Form / T123) -->
  <p class="zm-form-slot__hint">${esc(label)}<br />Поля: имя, телефон. После вставки удалите эту подсказку.</p>
</div>`;
}

function sectionHead(eyebrow, heading, lead) {
  return `${eyebrow ? `<p class="zm-eyebrow">${esc(eyebrow)}</p>` : ""}
<h2 class="zm-h2">${esc(heading)}</h2>
${lead ? `<p class="zm-lead">${esc(lead)}</p>` : ""}`;
}

function renderWho(c) {
  if (!c.whoFits?.length) return "";
  const n = c.whoFits.length;
  const joined = Boolean(c.whoJoiner) && n === 3;
  const gridClass = [
    "zm-who__grid",
    joined ? "zm-who__grid--joined" : "",
    n === 4 ? "zm-who__grid--quad" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const parts = [];
  c.whoFits.forEach((f, i) => {
    if (i > 0 && joined) {
      parts.push(
        `<p class="zm-who__joiner" aria-hidden="true">${esc(c.whoJoiner)}</p>`,
      );
    }
    parts.push(`<article class="zm-who__card">
  <p class="zm-who__label">${esc(f.label)}</p>
  <h3 class="zm-who__title">${esc(f.title)}</h3>
  <p class="zm-who__note">${esc(f.note)}</p>
  <img class="zm-who__img" src="${esc(asset(f.image))}" alt="" loading="lazy" />
</article>`);
  });

  return `<section class="zm-section" id="zm-who">
  <div class="zm-inner">
    ${sectionHead(c.whoEyebrow, c.whoHeading, c.whoLead)}
    <div class="${gridClass}">${parts.join("\n")}</div>
  </div>
</section>`;
}

function renderAcc(items, heading, eyebrow) {
  if (!items?.length) return "";
  const rows = items
    .map((item) => {
      const title = item.title || item.question;
      const text = item.text || item.answer;
      return `<details class="zm-acc__item">
  <summary>${esc(title)}</summary>
  <div class="zm-acc__body"><p>${esc(text)}</p></div>
</details>`;
    })
    .join("\n");

  return `<section class="zm-section zm-section--tight">
  <div class="zm-inner">
    ${sectionHead(eyebrow, heading)}
    <div class="zm-acc">${rows}</div>
  </div>
</section>`;
}

function renderSteps(c) {
  const steps = c.steps ?? [];
  if (!steps.length) return "";
  const items = steps
    .map(
      (s) => `<li class="zm-steps__item">
  <h3 class="zm-steps__title">${esc(s.title)}</h3>
  <p class="zm-steps__text">${esc(s.text)}</p>
</li>`,
    )
    .join("\n");

  return `<section class="zm-section" id="zm-steps">
  <div class="zm-inner">
    ${sectionHead(c.stepsEyebrow, c.stepsHeading || "Как это работает")}
    <ol class="zm-steps__list">${items}</ol>
  </div>
</section>`;
}

function renderFinance(c) {
  if (!c.finance?.length) return "";
  const cards = c.finance
    .map((f) => {
      const href = resolveHref(f.href, f.form);
      return `<a class="zm-finance__card" href="${esc(href)}">
  <img class="zm-finance__img" src="${esc(asset(f.image))}" alt="" loading="lazy" />
  <div class="zm-finance__body">
    <h3 class="zm-finance__title">${esc(f.title)}</h3>
    <p class="zm-finance__text">${esc(f.text)}</p>
    <span class="zm-finance__cta">${esc(f.cta)} →</span>
  </div>
</a>`;
    })
    .join("\n");

  return `<section class="zm-section" id="zm-finance">
  <div class="zm-inner">
    ${sectionHead(c.financeEyebrow, c.financeHeading || "Что можно оформить")}
    <div class="zm-finance__grid">${cards}</div>
  </div>
</section>`;
}

function renderConditions(c) {
  if (!c.conditions?.length) return "";
  const rows = c.conditions
    .map((row) => {
      const valueClass = row.mark
        ? "zm-cond__value zm-cond__value--mark"
        : "zm-cond__value";
      const value = row.mark ? "" : esc(row.value || "");
      const points = row.points?.length
        ? `<ul class="zm-cond__points">${row.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>`
        : "";
      return `<div class="zm-cond__row">
  <p class="${valueClass}">${value}</p>
  <div>
    <h3 class="zm-cond__title">${esc(row.title)}</h3>
    ${row.text ? `<p class="zm-cond__text">${esc(row.text)}</p>` : ""}
    ${points}
  </div>
</div>`;
    })
    .join("\n");

  const note = (c.conditionsNote || [])
    .map((n) => `<p>${esc(n)}</p>`)
    .join("\n");

  return `<section class="zm-section" id="zm-conditions">
  <div class="zm-inner">
    ${sectionHead(c.conditionsEyebrow, c.conditionsHeading)}
    <div class="zm-cond">${rows}</div>
    ${note ? `<div class="zm-cond__note">${note}</div>` : ""}
  </div>
</section>`;
}

function renderMidCta(c, meta) {
  const cut = meta.midCutout || c.midCtaCutout;
  const cls = cut ? "zm-section zm-cta zm-cta--light" : "zm-section zm-cta";
  const mediaCls = cut
    ? "zm-cta__media zm-cta__media--cutout"
    : "zm-cta__media";
  return `<section class="${cls}" id="zm-mid-form">
  <div class="zm-inner">
    <div class="zm-cta__panel">
      <div class="${mediaCls}" aria-hidden="true">
        <img src="${esc(asset(c.midCtaImage || c.heroImage))}" alt="" loading="lazy" />
      </div>
      <div class="zm-cta__body">
        <h2 class="zm-h2">${esc(c.midCtaHeading)}</h2>
        <p class="zm-lead">${esc(c.midCtaLead)}</p>
        ${formSlot("mid")}
      </div>
    </div>
  </div>
</section>`;
}

function renderFaqBanks(c) {
  const faq = c.faq?.length
    ? renderAcc(c.faq, c.faqHeading || "Частые вопросы", c.faqEyebrow)
    : "";

  const logos = BANKS.map(
    (b) =>
      `<img src="${esc(asset(b.src))}" alt="${esc(b.name)}" title="${esc(b.name)}" loading="lazy" />`,
  ).join("\n");

  const banks = `<section class="zm-section zm-section--tight zm-banks">
  <div class="zm-inner">
    <p class="zm-eyebrow">Партнёры</p>
    <h2 class="zm-h2">Работаем с ведущими банками</h2>
    <div class="zm-banks__row">${logos}</div>
  </div>
</section>`;

  return `${faq}\n${banks}`;
}

function renderOther(currentId, otherCopy) {
  const cards = PROGRAM_CARDS.filter((p) => p.id !== currentId)
    .map(
      (p) => `<a class="zm-program" href="#">
  <p class="zm-program__rate">${esc(p.rate)}</p>
  <h3 class="zm-program__title">${esc(p.title)}</h3>
  <p class="zm-program__note">${esc(p.note)}</p>
  <img class="zm-program__img" src="${esc(asset(p.image))}" alt="" loading="lazy" />
</a>`,
    )
    .join("\n");

  const lead =
    "Помимо этой — IT, сельская, семейная и базовые программы банков. Ссылки на страницы появятся позже.";

  return `<section class="zm-section" id="zm-other">
  <div class="zm-inner">
    ${sectionHead(otherCopy.eyebrow, otherCopy.heading, lead)}
    <div class="zm-programs__grid">${cards}</div>
  </div>
</section>`;
}

function renderContacts(c) {
  const heading = c.formHeading || "Получить консультацию";
  const body =
    c.formBody ||
    "Оставьте телефон — рассчитаем платёж и подскажем, подходит ли программа.";

  return `<section class="zm-section" id="zm-contacts">
  <div class="zm-inner zm-contacts__grid">
    <div>
      <p class="zm-eyebrow">Контакты</p>
      <h2 class="zm-h2">Свяжитесь с нами</h2>
      <div class="zm-contacts__list">
        <p class="zm-contacts__item">
          <span class="zm-contacts__label">Телефон</span>
          <a class="zm-contacts__value" href="${SITE.phoneHref}">${esc(SITE.phone)}</a>
        </p>
        <p class="zm-contacts__item">
          <span class="zm-contacts__label">Почта</span>
          <a class="zm-contacts__value" href="mailto:${SITE.email}">${esc(SITE.email)}</a>
        </p>
        <p class="zm-contacts__item">
          <span class="zm-contacts__label">Офис</span>
          <span class="zm-contacts__value zm-contacts__addr">${esc(SITE.address)}</span>
        </p>
      </div>
    </div>
    <div>
      <h2 class="zm-h2">${esc(heading)}</h2>
      <p class="zm-lead">${esc(body)}</p>
      ${formSlot("contacts")}
    </div>
  </div>
</section>`;
}

function renderHero(c, meta) {
  const cut = meta.heroCutout || c.heroCutout;
  const frameCls = cut ? "zm-hero__frame zm-hero__frame--cutout" : "zm-hero__frame";
  return `<section class="zm-hero" id="zm-hero">
  <div class="zm-inner">
    <div class="${frameCls}">
      <div class="zm-hero__media">
        <img src="${esc(asset(c.heroImage))}" alt="" />
      </div>
      <div class="zm-hero__veil" aria-hidden="true"></div>
      <div class="zm-hero__body">
        <h1 class="zm-hero__title">${esc(c.headingLine)}<br />${esc(c.headingBefore)}<em>${esc(c.headingRate)}</em></h1>
        <p class="zm-hero__lead">${esc(c.lead)}</p>
        <div class="zm-hero__actions">
          <a class="zm-btn" href="#zm-mid-form">Оставить заявку</a>
          <a class="zm-hero__more" href="${ASSET}/catalog">Выбрать проект</a>
        </div>
      </div>
    </div>
  </div>
</section>`;
}

function buildPage(meta, content, otherCopy, css) {
  const c = content[meta.key];
  const body = [
    renderHero(c, meta),
    renderWho(c),
    c.rules?.length ? renderAcc(c.rules, c.rulesHeading, null) : "",
    renderSteps(c),
    renderFinance(c),
    renderConditions(c),
    renderMidCta(c, meta),
    renderFaqBanks(c),
    renderOther(meta.id, otherCopy),
    renderContacts(c),
  ]
    .filter(Boolean)
    .join("\n\n");

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(meta.title)}</title>
  <style>
${css}
  </style>
</head>
<body>
<!--
  Zero Block: вставьте содержимое <div class="zm-page">…</div> в HTML-элемент блока.
  Стили уже внутри — либо оставьте <style>, либо вынесите shared.css в Settings → HTML/CSS.
  Формы: замените .zm-form-slot на виджет формы Тильды.
-->
<div class="zm-page" data-program="${esc(meta.id)}">
${body}
</div>
</body>
</html>
`;
}

const contentPath = join(__dir, "_content.json");
const content = JSON.parse(readFileSync(contentPath, "utf8"));
const css = readFileSync(join(__dir, "shared.css"), "utf8");

for (const meta of PAGES) {
  const html = buildPage(meta, content, content.mortgageOtherPrograms, css);
  writeFileSync(join(__dir, meta.file), html, "utf8");
  console.log("wrote", meta.file, `(${(html.length / 1024).toFixed(1)} KB)`);
}

/* Промежуточный JSON не нужен в репозитории — пересоберём из copy.ts. */
try {
  unlinkSync(contentPath);
} catch {
  /* ok */
}
