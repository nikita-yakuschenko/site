"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useConsent } from "./ConsentProvider";
import type { CookieConsentState } from "./types";

function Toggle({
  id,
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (value: boolean) => void;
}) {
  return (
    <div className="cookie-settings__row">
      <div className="cookie-settings__copy">
        <label htmlFor={id} className="cookie-settings__label">
          {label}
        </label>
        <p id={`${id}-desc`} className="cookie-settings__desc">
          {description}
        </p>
      </div>
      <input
        id={id}
        type="checkbox"
        className="cookie-settings__switch"
        checked={checked}
        disabled={disabled}
        aria-describedby={`${id}-desc`}
        onChange={(event) => onChange?.(event.target.checked)}
      />
    </div>
  );
}

export function CookieSettingsDialog() {
  const {
    settingsOpen,
    closeConsentSettings,
    state,
    acceptAll,
    acceptNecessaryOnly,
    saveCustom,
  } = useConsent();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [functional, setFunctional] = useState(state.functional);
  const [analytics, setAnalytics] = useState(state.analytics);
  const [marketing, setMarketing] = useState(state.marketing);

  /* Окно открылось (или согласие поменялось снаружи, пока оно открыто) —
     переключатели берут текущее состояние. Сверка идёт в рендере, а не
     эффектом: setState внутри эффекта даёт лишний проход отрисовки, и один
     кадр окно показывает прежние положения переключателей. */
  const [seen, setSeen] = useState<{ open: boolean; state: CookieConsentState }>({
    open: settingsOpen,
    state,
  });
  if (seen.open !== settingsOpen || seen.state !== state) {
    setSeen({ open: settingsOpen, state });
    if (settingsOpen) {
      setFunctional(state.functional);
      setAnalytics(state.analytics);
      setMarketing(state.marketing);
    }
  }

  useEffect(() => {
    if (!settingsOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const panel = panelRef.current;
    const focusable = panel?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    focusable?.[0]?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeConsentSettings();
        return;
      }
      if (event.key !== "Tab" || !focusable?.length) return;
      const list = [...focusable];
      const first = list[0];
      const last = list[list.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [settingsOpen, closeConsentSettings]);

  if (!settingsOpen) return null;

  return (
    <div
      className="cookie-settings"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={closeConsentSettings}
    >
      <div
        className="cookie-settings__panel"
        ref={panelRef}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId}>Настройки cookie</h2>
        <p className="cookie-settings__lead">
          Выберите категории. Необходимые всегда включены — без них сайт не
          работает.
        </p>

        <Toggle
          id="consent-necessary"
          label="Необходимые"
          description="Нужны для работы и безопасности сайта. Отключить нельзя."
          checked
          disabled
        />
        <Toggle
          id="consent-functional"
          label="Функциональные"
          description="Сохраняют ваши настройки и позволяют загружать дополнительный контент: видео, чаты и другие необязательные функции."
          checked={functional}
          onChange={setFunctional}
        />
        <Toggle
          id="consent-analytics"
          label="Аналитические"
          description="Помогают понять, как используется сайт, сравнивать варианты интерфейсов и улучшать пользовательский опыт."
          checked={analytics}
          onChange={setAnalytics}
        />
        <Toggle
          id="consent-marketing"
          label="Маркетинговые"
          description="Используются для оценки рекламных кампаний, формирования аудиторий и ретаргетинга."
          checked={marketing}
          onChange={setMarketing}
        />

        <div className="cookie-settings__actions">
          <button
            type="button"
            className="btn btn-yellow"
            onClick={() =>
              saveCustom({ functional, analytics, marketing })
            }
          >
            Сохранить выбор
          </button>
          <button type="button" className="btn btn-yellow" onClick={acceptAll}>
            Принять все
          </button>
          <button type="button" className="btn" onClick={acceptNecessaryOnly}>
            Только необходимые
          </button>
        </div>
      </div>
    </div>
  );
}
