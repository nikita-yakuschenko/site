"use client";

import { useConsent } from "./ConsentProvider";

/** Placeholder вместо внешнего iframe/скрипта до functional consent. */
export function EmbedPlaceholder({
  title,
  message = "Для просмотра разрешите функциональные cookie.",
}: {
  title: string;
  message?: string;
}) {
  const { saveCustom, state } = useConsent();

  return (
    <div className="consent-embed-placeholder" role="group" aria-label={title}>
      <p className="consent-embed-placeholder__title">{title}</p>
      <p className="consent-embed-placeholder__text">{message}</p>
      <button
        type="button"
        className="btn btn-yellow"
        onClick={() =>
          saveCustom({
            functional: true,
            analytics: state.analytics,
            marketing: state.marketing,
          })
        }
      >
        Разрешить и показать
      </button>
    </div>
  );
}
