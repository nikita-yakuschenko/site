import {
  CONSENT_COOKIE,
  CONSENT_MAX_AGE,
  CONSENT_VERSION,
  DEFAULT_CONSENT,
  type CookieConsentState,
} from "./types";

function isSecure(): boolean {
  if (typeof window === "undefined") {
    return process.env.NODE_ENV === "production";
  }
  return window.location.protocol === "https:";
}

export function serializeConsent(state: CookieConsentState): string {
  return encodeURIComponent(JSON.stringify(state));
}

export function parseConsent(raw: string | undefined | null): CookieConsentState | null {
  if (!raw) return null;
  try {
    let text = raw;
    try {
      text = decodeURIComponent(raw);
    } catch {
      // Уже декодировано (Next.js cookies API).
    }
    const parsed = JSON.parse(text) as Partial<CookieConsentState>;
    if (
      typeof parsed !== "object" ||
      !parsed ||
      typeof parsed.version !== "string" ||
      typeof parsed.decidedAt !== "string"
    ) {
      return null;
    }
    return {
      version: parsed.version,
      decidedAt: parsed.decidedAt,
      necessary: true,
      functional: Boolean(parsed.functional),
      analytics: Boolean(parsed.analytics),
      marketing: Boolean(parsed.marketing),
    };
  } catch {
    return null;
  }
}

/** Чтение из document.cookie (клиент). */
export function readConsentCookie(): CookieConsentState | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${CONSENT_COOKIE}=`));
  if (!match) return null;
  return parseConsent(match.slice(CONSENT_COOKIE.length + 1));
}

export function writeConsentCookie(state: CookieConsentState): void {
  if (typeof document === "undefined") return;
  const secure = isSecure() ? "; Secure" : "";
  document.cookie = `${CONSENT_COOKIE}=${serializeConsent(state)}; Path=/; Max-Age=${CONSENT_MAX_AGE}; SameSite=Lax${secure}`;
}

export function clearConsentCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${CONSENT_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function buildConsentState(
  partial: Pick<CookieConsentState, "functional" | "analytics" | "marketing">,
): CookieConsentState {
  return {
    version: CONSENT_VERSION,
    decidedAt: new Date().toISOString(),
    necessary: true,
    functional: partial.functional,
    analytics: partial.analytics,
    marketing: partial.marketing,
  };
}

export function acceptAllState(): CookieConsentState {
  return buildConsentState({
    functional: true,
    analytics: true,
    marketing: true,
  });
}

export function necessaryOnlyState(): CookieConsentState {
  return buildConsentState({
    functional: false,
    analytics: false,
    marketing: false,
  });
}

export { DEFAULT_CONSENT };
