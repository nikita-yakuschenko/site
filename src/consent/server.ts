import { cookies } from "next/headers";
import { parseConsent } from "./storage";
import {
  CONSENT_COOKIE,
  isConsentDecided,
  type CookieConsentState,
} from "./types";

/** SSR: начальное состояние consent из first-party cookie. */
export async function readConsentFromRequest(): Promise<CookieConsentState | null> {
  const jar = await cookies();
  const raw = jar.get(CONSENT_COOKIE)?.value;
  const parsed = parseConsent(raw);
  if (!parsed || !isConsentDecided(parsed)) return null;
  return parsed;
}
