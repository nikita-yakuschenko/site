import { permanentRedirect } from "next/navigation";

/** Старый /legal/referral → /referral. */
export default function LegacyLegalReferralPage() {
  permanentRedirect("/referral");
}
