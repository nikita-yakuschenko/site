import { permanentRedirect } from "next/navigation";

/** Старый /legal/cookies → /cookies. */
export default function LegacyLegalCookiesPage() {
  permanentRedirect("/cookies");
}
