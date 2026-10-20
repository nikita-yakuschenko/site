import { canPersistFunctional } from "../consent/functional-persist";
import { copy } from "./copy";
import {
  REGION_COOKIE,
  regionFromSearch,
  type TrafficRegion,
} from "./region-traffic";

export const REGIONS = [
  { code: "nn", name: copy.regionNn, mark: "/regions/nn2.svg", tone: "dark" },
  { code: "msk", name: copy.regionMsk, mark: "/regions/msk.svg", tone: "light" },
] as const;

export type RegionCode = (typeof REGIONS)[number]["code"];
export type RegionTone = (typeof REGIONS)[number]["tone"];

export { REGION_COOKIE, regionFromSearch };

const STORAGE_KEY = "avgst:region";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

let sessionRegion: RegionCode | null = null;


export function regionByCode(code: string | null | undefined): (typeof REGIONS)[number] {
  return REGIONS.find((region) => region.code === code) || REGIONS[0];
}

export function readCookieRegionCode(): RegionCode | null {
  if (typeof document === "undefined") return null;
  const entry = document.cookie.split(';').map(value => value.trim()).find(value => value.startsWith(`${REGION_COOKIE}=`));
  if (!entry) return null;
  try {
    const value = decodeURIComponent(entry.slice(REGION_COOKIE.length + 1));
    return value === "nn" || value === "msk" ? value : null;
  } catch {
    return null;
  }
}

function writeCookieRegion(code: RegionCode): void {
  if (typeof document === "undefined") return;
  const lifetime = canPersistFunctional() ? `; Max-Age=${COOKIE_MAX_AGE}` : "";
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${REGION_COOKIE}=${code}; Path=/; SameSite=Lax${lifetime}${secure}`;
}

export function readRegionCode(): RegionCode {
  if (typeof window === "undefined") return "nn";
  if (sessionRegion) return sessionRegion;
  const fromCookie = readCookieRegionCode();
  if (fromCookie) {
    sessionRegion = fromCookie;
    return fromCookie;
  }
  try {
    return regionByCode(window.localStorage.getItem(STORAGE_KEY)).code;
  } catch {
    return "nn";
  }
}

export function writeRegionCode(code: RegionCode): void {
  sessionRegion = code;
  // Регион цен доступен SSR; без functional-согласия cookie только сессионная.
  writeCookieRegion(code);
  if (canPersistFunctional()) {
    try {
      window.localStorage.setItem(STORAGE_KEY, code);
    } catch {
      /* cookie уже записан */
    }
  }
  notifyRegion();
}

/**
 * Если в URL есть московская метка — фиксируем msk.
 * Иначе null (сохранённый регион не трогаем).
 */
export function applyRegionFromSearch(
  search: string = typeof window !== "undefined" ? window.location.search : "",
): TrafficRegion | null {
  const marked = regionFromSearch(search);
  if (marked === "msk") {
    writeRegionCode("msk");
    return "msk";
  }
  return null;
}

const regionListeners = new Set<() => void>();

function notifyRegion(): void {
  for (const listener of regionListeners) listener();
}

/** Фолбэк для потребителей вне провайдера региона. */
export function readServerRegionCode(): RegionCode {
  return "nn";
}

export function subscribeRegion(listener: () => void): () => void {
  regionListeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === STORAGE_KEY) {
      sessionRegion = null;
      notifyRegion();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    regionListeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}
