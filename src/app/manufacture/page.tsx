import type { Metadata } from "next";
import { InfoPage } from "../../components/info-page";
import { copy } from "../../lib/copy";

export const metadata: Metadata = {
  title: copy.productionTitle,
  description: copy.productionLead,
};

export default function ManufacturePage() {
  return (
    <InfoPage
      eyebrow={copy.production}
      title={copy.productionTitle}
      lead={copy.productionLead}
      items={copy.productionSteps.map((step) => step.title)}
      cta={copy.factoryTour}
    />
  );
}
