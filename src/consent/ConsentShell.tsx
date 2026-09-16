"use client";

import { CookieBanner } from "./CookieBanner";
import { CookieSettingsDialog } from "./CookieSettingsDialog";
import { ConsentProvider } from "./ConsentProvider";
import type { CookieConsentState } from "./types";
import type { ReactNode } from "react";

/** Клиентская оболочка: provider + banner + settings. */
export function ConsentShell({
  initialState,
  children,
}: {
  initialState?: CookieConsentState | null;
  children: ReactNode;
}) {
  return (
    <ConsentProvider initialState={initialState}>
      {children}
      <CookieBanner />
      <CookieSettingsDialog />
    </ConsentProvider>
  );
}
