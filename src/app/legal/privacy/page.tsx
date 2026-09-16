import { permanentRedirect } from "next/navigation";

/** Старый /legal/privacy → /privacy. */
export default function LegacyLegalPrivacyPage() {
  permanentRedirect("/privacy");
}
