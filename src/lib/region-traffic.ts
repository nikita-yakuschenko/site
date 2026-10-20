/** Cookie с регионом для SSR и повторов захода. */
export const REGION_COOKIE = "avgst_region";

export type TrafficRegion = "nn" | "msk";

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
