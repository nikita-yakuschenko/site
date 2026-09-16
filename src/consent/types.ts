/** Категории cookie-согласия (AV4 cookie consent). */
export type ConsentCategory =
  | "necessary"
  | "functional"
  | "analytics"
  | "marketing";

export type ConsentAction =
  | "accept_all"
  | "necessary_only"
  | "save_custom"
  | "update"
  | "revoke_optional";

export interface CookieConsentState {
  version: string;
  decidedAt: string;
  necessary: true;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
}

export interface CookieConsentEvent {
  id: string;
  consentVersion: string;
  createdAt: string;
  action: ConsentAction;
  necessary: true;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  pageUrl: string;
  ip?: string;
  userAgent?: string;
}

export const CONSENT_COOKIE = "avgst_cookie_consent";
export const CONSENT_VERSION = "2026-09-16.2";
export const CONSENT_MAX_AGE = 31_536_000; // 12 месяцев

export const DEFAULT_CONSENT: CookieConsentState = {
  version: CONSENT_VERSION,
  decidedAt: "",
  necessary: true,
  functional: false,
  analytics: false,
  marketing: false,
};

export function isConsentDecided(state: CookieConsentState | null): boolean {
  return Boolean(state?.decidedAt && state.version === CONSENT_VERSION);
}

export function hasConsent(
  state: CookieConsentState | null | undefined,
  category: ConsentCategory,
): boolean {
  if (!state) return category === "necessary";
  if (category === "necessary") return true;
  return Boolean(state[category]);
}
