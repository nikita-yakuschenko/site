import { permanentRedirect } from "next/navigation";

/** Старый /personal-data → /privacy. */
export default function PersonalDataRedirectPage() {
  permanentRedirect("/privacy");
}
