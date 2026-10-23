"use client";

import { CookieBanner } from "./CookieBanner";
import { CookieSettingsDialog } from "./CookieSettingsDialog";
import { ConsentProvider } from "./ConsentProvider";
import type { CookieConsentState } from "./types";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { VkPixel } from "../components/vk-pixel";

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
      <Suspense fallback={null}><VkPixel /></Suspense>
      {children}
      <CookieBanner />
      <CookieSettingsDialog />
    </ConsentProvider>
  );
}
