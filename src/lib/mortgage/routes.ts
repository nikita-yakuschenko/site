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
  { id: "family", slug: "family-mortgage", title: "Семейная ипотека" },
  { id: "it", slug: "it-mortgage", title: "IT-ипотека" },
  { id: "rural", slug: "agro-mortgage", title: "Сельская ипотека" },
  { id: "market", slug: "basic-mortgage", title: "Рыночная ипотека" },
] as const satisfies readonly {
  id: MortgageProgramId;
  slug: string;
  title: string;
}[];

/**
 * Название программы целиком.
 *
 * Держится рядом со слагом, а не собирается из короткого label: «Семейная»
 * плюс «Ипотека» давало «Ипотека — Семейная», что не название, а опись.
 * Отсюда его берут и заголовок вкладки, и хлебные крошки — расходиться им
 * теперь негде.
 */
export function mortgageTitle(id: MortgageProgramId): string {
  const route = MORTGAGE_ROUTES.find((r) => r.id === id);
  return route ? route.title : MORTGAGE_ROUTES[0].title;
}

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
