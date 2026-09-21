"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { cleanupCategory } from "./cleanup";
import { initCategory, revokeCategoryIntegrations } from "./registry";
import {
  acceptAllState,
  necessaryOnlyState,
  buildConsentState,
  writeConsentCookie,
  DEFAULT_CONSENT,
} from "./storage";
import {
  isConsentDecided,
  hasConsent as hasConsentState,
  type ConsentAction,
  type ConsentCategory,
  type CookieConsentState,
} from "./types";
import "./integrations/register";

type ConsentContextValue = {
  state: CookieConsentState;
  decided: boolean;
  ready: boolean;
  settingsOpen: boolean;
  hasConsent: (category: ConsentCategory) => boolean;
  acceptAll: () => void;
  acceptNecessaryOnly: () => void;
  saveCustom: (next: {
    functional: boolean;
    analytics: boolean;
    marketing: boolean;
  }) => void;
  openConsentSettings: () => void;
  closeConsentSettings: () => void;
};

const ConsentContext = createContext<ConsentContextValue | null>(null);

async function postAudit(
  action: ConsentAction,
  state: CookieConsentState,
): Promise<void> {
  try {
    await fetch("/api/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        consentVersion: state.version,
        functional: state.functional,
        analytics: state.analytics,
        marketing: state.marketing,
        pageUrl: typeof window !== "undefined" ? window.location.href : "",
      }),
      keepalive: true,
    });
  } catch {
    // Аудит не должен ломать UX.
  }
}

async function applySideEffects(
  prev: CookieConsentState | null,
  next: CookieConsentState,
): Promise<void> {
  const categories = ["functional", "analytics", "marketing"] as const;
  for (const category of categories) {
    const was = prev ? Boolean(prev[category]) : false;
    const now = Boolean(next[category]);
    if (!was && now) await initCategory(category);
    if (was && !now) {
      await revokeCategoryIntegrations(category);
      cleanupCategory(category);
    }
  }
}

export function ConsentProvider({
  initialState,
  children,
}: {
  initialState?: CookieConsentState | null;
  children: ReactNode;
}) {
  const [state, setState] = useState<CookieConsentState>(
    () => initialState ?? DEFAULT_CONSENT,
  );
  const [settingsOpen, setSettingsOpen] = useState(false);

  /* Состояние приходит с сервера: ту же куку читает layout, он же отсеивает
     устаревшую версию. Перечитывать её здесь и переписывать состояние после
     отрисовки незачем, на клиенте остаётся только применить последствия
     уже принятого согласия. */
  useEffect(() => {
    if (!initialState) return;
    void applySideEffects(null, initialState);
  }, [initialState]);

  const persist = useCallback(
    (next: CookieConsentState, action: ConsentAction, prev: CookieConsentState | null) => {
      writeConsentCookie(next);
      setState(next);
      setSettingsOpen(false);
      void (async () => {
        await applySideEffects(prev, next);
        await postAudit(action, next);
      })();
    },
    [],
  );

  const acceptAll = useCallback(() => {
    const next = acceptAllState();
    persist(next, "accept_all", state.decidedAt ? state : null);
  }, [persist, state]);

  const acceptNecessaryOnly = useCallback(() => {
    const next = necessaryOnlyState();
    const action: ConsentAction = state.decidedAt
      ? "revoke_optional"
      : "necessary_only";
    persist(next, action, state.decidedAt ? state : null);
  }, [persist, state]);

  const saveCustom = useCallback(
    (nextPartial: {
      functional: boolean;
      analytics: boolean;
      marketing: boolean;
    }) => {
      const next = buildConsentState(nextPartial);
      const action: ConsentAction = state.decidedAt ? "update" : "save_custom";
      persist(next, action, state.decidedAt ? state : null);
    },
    [persist, state],
  );

  const decided = isConsentDecided(state);

  const value = useMemo<ConsentContextValue>(
    () => ({
      state,
      decided,
      ready: true,
      settingsOpen,
      hasConsent: (category) => hasConsentState(state, category),
      acceptAll,
      acceptNecessaryOnly,
      saveCustom,
      openConsentSettings: () => setSettingsOpen(true),
      closeConsentSettings: () => setSettingsOpen(false),
    }),
    [
      state,
      decided,
      settingsOpen,
      acceptAll,
      acceptNecessaryOnly,
      saveCustom,
    ],
  );

  return (
    <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>
  );
}

export function useConsent(): ConsentContextValue {
  const ctx = useContext(ConsentContext);
  if (!ctx) {
    throw new Error("useConsent must be used within ConsentProvider");
  }
  return ctx;
}

/** Безопасный хук для мест вне провайдера (не бросает). */
export function useConsentOptional(): ConsentContextValue | null {
  return useContext(ConsentContext);
}
