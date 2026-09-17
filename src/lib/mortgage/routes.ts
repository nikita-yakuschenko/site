import type { MortgageProgramId } from "./programs";

/**
 * Адреса программ.
 *
 * Слаг — часть публичного адреса, поэтому он живёт отдельно от внутреннего
 * идентификатора: id короткие и техничные (rural, market), а в адресе нужны
 * слова, по которым страницу ищут. Менять id из-за адреса и наоборот больше
 * не придётся — связь описана здесь одной таблицей.
 */
export const MORTGAGE_ROUTES = [
  { id: "family", slug: "family-mortgage" },
  { id: "it", slug: "it-mortgage" },
  { id: "rural", slug: "agro-mortgage" },
  { id: "market", slug: "basic-mortgage" },
] as const satisfies readonly { id: MortgageProgramId; slug: string }[];

export type MortgageSlug = (typeof MORTGAGE_ROUTES)[number]["slug"];

/** Куда ведёт программа. Используется во всех внутренних ссылках. */
export function mortgageHref(id: MortgageProgramId): string {
  const route = MORTGAGE_ROUTES.find((r) => r.id === id);
  return `/${route ? route.slug : MORTGAGE_ROUTES[0].slug}`;
}

/** Обратный разбор: из адреса в программу. */
export function programBySlug(slug: string): MortgageProgramId | undefined {
  return MORTGAGE_ROUTES.find((r) => r.slug === slug)?.id;
}
