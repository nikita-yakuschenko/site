/**
 * Typed analytics API с allowlist полей и guard от PII в development.
 * Категория: analytics. До согласия события не отправляются.
 */

import { readConsentCookie } from "./storage";
import { hasConsent } from "./types";

const PII_KEYS = new Set([
  "name",
  "firstName",
  "lastName",
  "surname",
  "phone",
  "email",
  "address",
  "passport",
  "password",
  "message",
  "comment",
  "freeText",
  "formData",
  "formBody",
]);

export type AnalyticsEvent =
  | { type: "page_view"; path: string; page?: string }
  | { type: "project_view"; projectId: string; houseSeries?: string }
  | { type: "cta_click"; cta: string; funnelStep?: string }
  | {
      type: "conversion";
      conversionType: string;
      projectId?: string;
      experimentId?: string;
      variantId?: string;
    }
  | {
      type: "experiment_exposure";
      experimentId: string;
      variantId: string;
    };

function assertNoPii(payload: Record<string, unknown>): boolean {
  for (const key of Object.keys(payload)) {
    if (PII_KEYS.has(key)) {
      if (process.env.NODE_ENV !== "production") {
        console.error(
          `[analytics] PII key blocked: "${key}". Event not sent.`,
        );
      }
      return false;
    }
  }
  return true;
}

/** Отправка события только при analytics consent. */
export function trackEvent(event: AnalyticsEvent): void {
  if (typeof window === "undefined") return;
  if (!hasConsent(readConsentCookie(), "analytics")) return;
  const payload = { ...event } as Record<string, unknown>;
  if (!assertNoPii(payload)) return;
  // Adapter: analytics.avgst.ru ещё не подключён.
  if (process.env.NODE_ENV !== "production") {
    console.debug("[analytics]", event);
  }
}
