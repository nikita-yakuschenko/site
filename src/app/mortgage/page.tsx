import type { Metadata } from "next";
import Link from "next/link";
import { IconChevronRight } from "@tabler/icons-react";
import { MortgagePageContent } from "../../components/mortgage-page";
import { SiteChrome } from "../../components/site-chrome";
import { FixtureCatalogProvider } from "../../lib/catalog/fixture-provider";
import { copy, footerAboutFor } from "../../lib/copy";
import type { MortgageProgramId } from "../../lib/mortgage";
import { SITE } from "../../lib/site";

const catalog = new FixtureCatalogProvider();

const PROGRAM_IDS = new Set<MortgageProgramId>([
  "family",
  "it",
  "rural",
  "market",
]);

function programFrom(
  value: string | string[] | undefined,
): MortgageProgramId | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !PROGRAM_IDS.has(raw as MortgageProgramId)) return undefined;
  return raw as MortgageProgramId;
}

export const metadata: Metadata = {
  title: copy.mortgageTitle,
  description: copy.mortgageLead,
};

export default async function MortgagePage({
  searchParams,
}: {
  searchParams: Promise<{ program?: string | string[] }>;
}) {
  const params = await searchParams;
  const { items } = await catalog.list({ siteCode: SITE.code });
  const initialProgramId = programFrom(params.program);

  return (
    <SiteChrome
      name={SITE.name}
      phone={SITE.contacts.phone}
      email={SITE.contacts.email}
      address={SITE.contacts.address}
      navigation={[...SITE.navigation]}
      overlay={false}
      footer={SITE.footer.legal}
      about={footerAboutFor(SITE.name)}
      subrow={
        <nav className="project-hero__crumbs" aria-label={copy.crumbsAria}>
          <Link href="/">{copy.breadcrumbsHome}</Link>
          <IconChevronRight size={14} stroke={2} aria-hidden="true" />
          <span aria-current="page">{copy.mortgage}</span>
        </nav>
      }
    >
      <main>
        <MortgagePageContent
          projects={items}
          initialProgramId={initialProgramId}
        />
      </main>
    </SiteChrome>
  );
}
