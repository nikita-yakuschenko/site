import fs from "node:fs";
import path from "node:path";

const root = path.resolve("public/catalog");

const PREFIX = {
  barhhouse: { series: "barn", name: "Барнхаус", tech: "Панельно-каркасный" },
  barnhouse: { series: "barn", name: "Барнхаус", tech: "Панельно-каркасный" },
  barnhuose: { series: "barn", name: "Барнхаус", tech: "Панельно-каркасный" },
  barnouse: { series: "barn", name: "Барнхаус", tech: "Панельно-каркасный" },
  cube: { series: "modular", name: "Куб", tech: "Модульный" },
  duplex: { series: "modular", name: "Дуплекс", tech: "Модульный" },
  frame: { series: "modular", name: "Фрейм", tech: "Модульный" },
  ekohouse: { series: "panel", name: "Экохаус", tech: "Панельно-каркасный" },
  finlyandiya: { series: "classic", name: "Финляндия", tech: "Панельно-каркасный" },
  kamelot: { series: "classic", name: "Камелот", tech: "Панельно-каркасный" },
  norvegiya: { series: "panel", name: "Норвегия", tech: "Панельно-каркасный" },
  scandi: { series: "classic", name: "Сканди", tech: "Панельно-каркасный" },
  shvedskii: { series: "panel", name: "Шведский", tech: "Панельно-каркасный" },
  uzorye: { series: "classic", name: "Узорье", tech: "Панельно-каркасный" },
};

const BLURB = {
  barn: (area) => `Дом в стиле барнхаус площадью ${area} м².`,
  panel: (area) => `Панельно-каркасный дом площадью ${area} м².`,
  classic: (area) => `Дом классической архитектуры площадью ${area} м².`,
  modular: (area) => `Модульный дом площадью ${area} м².`,
};

/* Этажи, спальни и санузлы — с планировок в папке проекта. */
const SPECS = {
  "barhhouse-73": { floors: 1, bedrooms: 3, bathrooms: 1 },
  "barnhouse-76": { floors: 1, bedrooms: 2, bathrooms: 1 },
  "barnhouse-86": { floors: 1, bedrooms: 2, bathrooms: 1 },
  "barnhuose-82": { floors: 1, bedrooms: 2, bathrooms: 1 },
  "barnouse-122": { floors: 1, bedrooms: 3, bathrooms: 1 },
  "barnhouse-90": { floors: 1, bedrooms: 3, bathrooms: 1 },
  "barnhouse-96": { floors: 1, bedrooms: 3, bathrooms: 1 },
  "barnhouse-98": { floors: 1, bedrooms: 1, bathrooms: 1 },
  "barnhouse-115": { floors: 1, bedrooms: 3, bathrooms: 2 },
  "barnhouse-129": { floors: 1, bedrooms: 3, bathrooms: 2 },
  "barnhouse-134": { floors: 1, bedrooms: 3, bathrooms: 2 },
  "barnhouse-138": { floors: 2, bedrooms: 4, bathrooms: 2 },
  "cube-100": { floors: 1, bedrooms: 3, bathrooms: 2 },
  "duplex-173": { floors: 1, bedrooms: 4, bathrooms: 2 },
  "frame-59": { floors: 1, bedrooms: 1, bathrooms: 1 },
  "frame-60": { floors: 1, bedrooms: 1, bathrooms: 1 },
  "kamelot-101": { floors: 1, bedrooms: 3, bathrooms: 1 },
  "kamelot-124": { floors: 1, bedrooms: 3, bathrooms: 1 },
  "scandi-90": { floors: 1, bedrooms: 3, bathrooms: 1 },
  "norvegiya-92": { floors: 1, bedrooms: 2, bathrooms: 1 },
  "norvegiya-115": { floors: 1, bedrooms: 3, bathrooms: 1 },
  "norvegiya-132": { floors: 1, bedrooms: 3, bathrooms: 2 },
  "ekohouse-120": { floors: 1, bedrooms: 3, bathrooms: 2 },
  "ekohouse-128": { floors: 1, bedrooms: 3, bathrooms: 2 },
  "ekohouse-132": { floors: 1, bedrooms: 3, bathrooms: 2 },
  "ekohouse-184": { floors: 2, bedrooms: 4, bathrooms: 2 },
  "finlyandiya-149": { floors: 1, bedrooms: 4, bathrooms: 2 },
  "uzorye-115": { floors: 1, bedrooms: 3, bathrooms: 2 },
  "uzorye-122": { floors: 1, bedrooms: 3, bathrooms: 1 },
  "uzorye-132": { floors: 1, bedrooms: 3, bathrooms: 2 },
  "shvedskii-121": { floors: 1, bedrooms: 3, bathrooms: 2 },
  "shvedskii-124": { floors: 1, bedrooms: 3, bathrooms: 2 },
  "shvedskii-130": { floors: 1, bedrooms: 3, bathrooms: 2 },
  "shvedskii-135": { floors: 1, bedrooms: 3, bathrooms: 2 },
  "shvedskii-142": { floors: 2, bedrooms: 3, bathrooms: 2 },
  "shvedskii-150": { floors: 1, bedrooms: 3, bathrooms: 2 },
  "shvedskii-161": { floors: 1, bedrooms: 4, bathrooms: 2 },
};

function quote(value) {
  return JSON.stringify(value);
}

const folders = fs.readdirSync(root).filter((name) =>
  fs.statSync(path.join(root, name)).isDirectory(),
);

const counts = { panel: 0, barn: 0, classic: 0, modular: 0 };
const records = [];

for (const folder of folders) {
  const match = folder.match(/^(.*)-(\d+)$/);
  if (!match) throw new Error(`Не разобрал папку ${folder}`);
  const [, prefix, area] = match;
  const meta = PREFIX[prefix];
  if (!meta) throw new Error(`Нет серии для префикса ${prefix}`);
  const spec = SPECS[folder];
  if (!spec) throw new Error(`Нет ТТХ для ${folder}`);
  counts[meta.series] += 1;

  const files = fs
    .readdirSync(path.join(root, folder))
    .filter((name) => /\.(jpe?g|png|webp)$/i.test(name))
    .sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
  if (!files.length) throw new Error(`Нет фото в ${folder}`);

  const urls = files.map((name) => `/catalog/${folder}/${name}`);
  records.push({
    id: folder,
    slug: folder,
    name: `${meta.name} ${area}`,
    area,
    areaValue: Number(area),
    floors: String(spec.floors),
    floorsValue: spec.floors,
    bedrooms: String(spec.bedrooms),
    bathrooms: String(spec.bathrooms),
    series: meta.series,
    technologyBadge: meta.tech,
    description: BLURB[meta.series](area),
    imageUrl: urls[0],
    exteriors: urls.slice(1),
  });
}

records.sort((a, b) => a.name.localeCompare(b.name, "ru", { numeric: true }));

const lines = [];
lines.push(`import { copy } from "../copy"`);
lines.push(`import type { CatalogProject, CatalogSeries } from "./types"`);
lines.push("");
lines.push(`/**`);
lines.push(` * Каталог из папок public/catalog.`);
lines.push(` *`);
lines.push(` * Серия читается из префикса папки: barn* — барнхаусы,`);
lines.push(` * shvedskii/norvegiya/ekohouse — панельно-каркасные,`);
lines.push(` * kamelot/uzorye/finlyandiya/scandi — классика,`);
lines.push(` * cube/duplex/frame — модульные. Площадь — число в имени.`);
lines.push(` * Этажи, спальни и санузлы — с планировок в той же папке.`);
lines.push(` */`);
lines.push("export const CATALOG_PROJECTS: CatalogProject[] = [");

for (const item of records) {
  lines.push("  {");
  lines.push(`    id: ${quote(item.id)},`);
  lines.push(`    slug: ${quote(item.slug)},`);
  lines.push(`    name: ${quote(item.name)},`);
  lines.push(`    area: ${quote(item.area)},`);
  lines.push(`    areaValue: ${item.areaValue},`);
  lines.push(`    floors: ${quote(item.floors)},`);
  lines.push(`    floorsValue: ${item.floorsValue},`);
  lines.push(`    bedrooms: ${quote(item.bedrooms)},`);
  lines.push(`    bathrooms: ${quote(item.bathrooms)},`);
  lines.push(`    priceLabel: copy.priceOnRequest,`);
  lines.push(`    priceAmount: null,`);
  lines.push(`    imageUrl: ${quote(item.imageUrl)},`);
  lines.push(`    technologyBadge: ${quote(item.technologyBadge)},`);
  lines.push(`    series: ${quote(item.series)},`);
  lines.push(`    href: ${quote(`/catalog/${item.slug}`)},`);
  lines.push(`    description: ${quote(item.description)},`);
  lines.push(`    exteriors: [`);
  for (const src of item.exteriors) lines.push(`      ${quote(src)},`);
  lines.push("    ],");
  lines.push("    interiors: [],");
  lines.push("    floorPlans: [],");
  lines.push("    options: [],");
  lines.push("  },");
}

lines.push("]");
lines.push("");
lines.push("export function countBySeries(series: CatalogSeries): number {");
lines.push("  return CATALOG_PROJECTS.filter((item) => item.series === series).length");
lines.push("}");
lines.push("");

fs.writeFileSync("src/lib/catalog/projects.ts", `${lines.join("\n")}\n`);
console.log(`projects: ${records.length}`, counts);
