import { readConsentCookie } from "./storage";
import { hasConsent } from "./types";

/** Можно ли писать functional localStorage (регион, избранное и т.п.). */
export function canPersistFunctional(): boolean {
  if (typeof window === "undefined") return false;
  return hasConsent(readConsentCookie(), "functional");
}
