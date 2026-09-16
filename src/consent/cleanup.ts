import type { ConsentCategory } from "./types";

/** First-party ключи, которые чистим при revoke категории. */
export const CLEANUP_KEYS: Record<
  Exclude<ConsentCategory, "necessary">,
  { cookies: string[]; prefixes: string[]; localStorage: string[]; sessionStorage: string[] }
> = {
  functional: {
    cookies: [],
    prefixes: [],
    localStorage: [
      "avgst:region",
      "avgst:favorites",
      "avgst:tech-bar-theme",
      "avgst-dev-notice",
    ],
    sessionStorage: [],
  },
  analytics: {
    cookies: ["_ym_uid", "_ym_d", "_ym_isad", "_ym_visorc", "roistat_visit"],
    prefixes: [
      "_ym_",
      "roistat",
      "avgst_analytics",
      "avgst_experiment_",
      "avgst_optimization_",
    ],
    localStorage: [],
    sessionStorage: [],
  },
  marketing: {
    cookies: [],
    prefixes: ["_ym_uid"], // аудитории могут делить; чистим маркетинговые по revoke callback
    localStorage: [],
    sessionStorage: [],
  },
};

function deleteCookie(name: string): void {
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

function clearByPrefix(
  store: Storage,
  prefixes: string[],
  exact: string[],
): void {
  const remove: string[] = [...exact];
  for (let i = 0; i < store.length; i += 1) {
    const key = store.key(i);
    if (!key) continue;
    if (prefixes.some((prefix) => key.startsWith(prefix))) remove.push(key);
  }
  for (const key of remove) {
    try {
      store.removeItem(key);
    } catch {
      // ignore
    }
  }
}

/** Удаляет first-party идентификаторы категории (клиент). */
export function cleanupCategory(
  category: Exclude<ConsentCategory, "necessary">,
): void {
  if (typeof document === "undefined") return;
  const spec = CLEANUP_KEYS[category];
  for (const name of spec.cookies) deleteCookie(name);

  const all = document.cookie.split("; ").map((row) => row.split("=")[0] ?? "");
  for (const name of all) {
    if (spec.prefixes.some((prefix) => name.startsWith(prefix))) {
      deleteCookie(name);
    }
  }

  try {
    clearByPrefix(localStorage, spec.prefixes, spec.localStorage);
  } catch {
    // ignore
  }
  try {
    clearByPrefix(sessionStorage, spec.prefixes, spec.sessionStorage);
  } catch {
    // ignore
  }
}
