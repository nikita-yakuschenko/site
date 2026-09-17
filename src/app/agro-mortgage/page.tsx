import type { Metadata } from "next";
import { MortgageProgramPage } from "../../components/mortgage-program-page";
import { copy } from "../../lib/copy";
import { mortgageTitle } from "../../lib/mortgage";

export const metadata: Metadata = {
  title: mortgageTitle("rural"),
  description: copy.mortgageLead,
};

export default function Page() {
  return <MortgageProgramPage programId="rural" />;
}
