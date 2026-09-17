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
    }
  | {
      type: "mortgage_calculator_open";
      program?: string;
    }
  | {
      type: "mortgage_program_selected";
      program: string;
    }
  | {
      type: "mortgage_parameters_changed";
      program: string;
      property_price?: number;
      down_payment?: number;
      term?: number;
      monthly_payment?: number;
      available_budget?: number;
      mode?: string;
    }
  | {
      type: "mortgage_calculation_completed";
      program: string;
      property_price?: number;
      down_payment?: number;
      term?: number;
      monthly_payment?: number;
      available_budget?: number;
      mode?: string;
    }
  | {
      type: "mortgage_project_clicked";
      program: string;
      projectId: string;
    }
  | {
      type: "mortgage_catalog_clicked";
      program: string;
      available_budget?: number;
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
