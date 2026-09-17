import type { Metadata } from "next";
import { MortgageProgramPage } from "../../components/mortgage-program-page";
import { copy } from "../../lib/copy";

export const metadata: Metadata = {
  title: "IT-ипотека",
  description: copy.mortgageLead,
};

export default function Page() {
  return <MortgageProgramPage programId="it" />;
}
