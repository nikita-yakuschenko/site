import type { CatalogProject, CatalogSeries } from "../catalog/types";

/**
 * Ориентировочная цена «от», пока в фикстурах priceAmount = null.
 * Когда CMS/фикстуры заполнят priceAmount — используется он.
 * Коэффициенты — порядок из публичных витрин AVGST, не оферта.
 */
const RUB_PER_M2: Record<CatalogSeries, number> = {
  modular: 58_000,
  barn: 50_000,
  panel: 52_000,
  classic: 48_000,
};

export function resolveProjectPrice(project: CatalogProject): number | null {
  if (project.priceAmount != null && project.priceAmount > 0) {
    return project.priceAmount;
  }
  if (!(project.areaValue > 0)) return null;
  const perM2 = RUB_PER_M2[project.series] ?? 50_000;
  return Math.round((project.areaValue * perM2) / 50_000) * 50_000;
}

export function getEligibleProjects(
  projects: readonly CatalogProject[],
  maxPropertyPrice: number,
  limit = 3,
): { total: number; items: CatalogProject[] } {
  if (!(maxPropertyPrice > 0)) return { total: 0, items: [] };
  const eligible = projects
    .map((p) => ({ project: p, price: resolveProjectPrice(p) }))
    .filter(
      (row): row is { project: CatalogProject; price: number } =>
        row.price != null && row.price <= maxPropertyPrice,
    )
    .sort((a, b) => b.price - a.price);
  return {
    total: eligible.length,
    items: eligible.slice(0, limit).map((row) => row.project),
  };
}

/**
 * Каталог с потолком бюджета. Схема адреса общая для всего каталога:
 * диапазон это один параметр, открытый край допустим, поэтому «до N»
 * записывается как price=-N. См. lib/catalog/filters.ts.
 */
export function catalogHrefWithMaxPrice(maxPrice: number): string {
  const rounded = Math.max(0, Math.round(maxPrice));
  return `/catalog?price=-${rounded}`;
}
