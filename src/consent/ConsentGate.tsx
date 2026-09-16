"use client";

import type { ReactNode } from "react";
import { useConsent } from "./ConsentProvider";
import type { ConsentCategory } from "./types";

/** Показывает children только при согласии на категорию. */
export function ConsentGate({
  category,
  fallback,
  children,
}: {
  category: ConsentCategory;
  fallback?: ReactNode;
  children: ReactNode;
}) {
  const { hasConsent } = useConsent();
  if (!hasConsent(category)) return fallback ?? null;
  return children;
}
