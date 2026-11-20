/** Cookie с регионом для SSR и повторов захода. */
export const REGION_COOKIE = "avgst_region";
export const SELECTED_REGION_COOKIE = "avgst_selected_region";

export type TrafficRegion = "nn" | "msk";

export const PRIMARY_SITE_HOST = "avgst.ru";
export const MOSCOW_SITE_HOST = "moscow.avgst.ru";

export function regionFromSiteHost(host: string | null): TrafficRegion | null {
  const hostname = host?.toLowerCase().split(":")[0];
  if (hostname === MOSCOW_SITE_HOST) return "msk";
  if (hostname === PRIMARY_SITE_HOST || hostname === `www.${PRIMARY_SITE_HOST}`) return "nn";
  return null;
}

export function regionSwitchUrl(current: URL, region: TrafficRegion): URL | null {
  const hostRegion = regionFromSiteHost(current.hostname);
  if (!hostRegion || hostRegion === region) return null;
  const host = region === "msk" ? MOSCOW_SITE_HOST : PRIMARY_SITE_HOST;
  const target = new URL(`https://${host}/api/site-region`);
  target.searchParams.set("returnTo", current.pathname + current.search + current.hash);
  return target;
}

/**
 * Москва, если в query/UTM есть msk.avgst.ru или токен msk
 * (отдельное значение или сегмент, не кусок другого слова).
 */
export function regionFromSearch(search: string): TrafficRegion | null {
  const raw = search.startsWith("?") ? search.slice(1) : search;
  if (!raw) return null;

  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    /* оставляем сырую строку */
  }

  if (looksLikeMoscowMark(decoded)) return "msk";

  const params = new URLSearchParams(raw);
  for (const [key, value] of params) {
    if (looksLikeMoscowMark(key) || looksLikeMoscowMark(value)) return "msk";
  }
  return null;
}

function looksLikeMoscowMark(text: string): boolean {
  const t = text.toLowerCase();
  return /(^|[^a-z0-9а-яё])msk([^a-z0-9а-яё]|$)/i.test(t);
}
