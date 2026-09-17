import type { Metadata } from "next";
import { MortgageProgramPage } from "../../components/mortgage-program-page";
import { copy } from "../../lib/copy";

export const metadata: Metadata = {
  title: "Семейная ипотека",
  description: copy.mortgageLead,
};

export default function Page() {
  return <MortgageProgramPage programId="family" />;
}
