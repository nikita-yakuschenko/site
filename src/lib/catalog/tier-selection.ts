/** Выбор комплектации общий для карточки проекта и ипотечного расчёта. */
const TIER_KEY = "avgst:project-tier";
export const DEFAULT_TIER = "standard";

const listeners = new Set<() => void>();
let fallback: string | null = null;

export function subscribeTier(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function readTier(): string {
  try {
    return window.localStorage.getItem(TIER_KEY) ?? fallback ?? DEFAULT_TIER;
  } catch {
    return fallback ?? DEFAULT_TIER;
  }
}

export function writeTier(id: string): void {
  fallback = id;
  try {
    window.localStorage.setItem(TIER_KEY, id);
  } catch {
    /* В приватном режиме выбор остаётся доступен до перезагрузки. */
  }
  listeners.forEach((listener) => listener());
}
