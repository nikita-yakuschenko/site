import Link from "next/link";
import { IconChevronRight } from "@tabler/icons-react";
import { MortgagePageContent } from "./mortgage-page";
import { SiteChrome } from "./site-chrome";
import { FixtureCatalogProvider } from "../lib/catalog/fixture-provider";
import { copy, footerAboutFor } from "../lib/copy";
import { getMortgageProgram, type MortgageProgramId } from "../lib/mortgage";
import { SITE } from "../lib/site";

const catalog = new FixtureCatalogProvider();

/**
 * Страница одной ипотечной программы.
 *
 * Общая для всех четырёх адресов: обвязка, крошки и содержимое одни и те же,
 * различается только выбранная программа и заголовок в крошках. Маршруты
 * поверх неё остаются тонкими — в них живут лишь метатеги, свои у каждой
 * программы.
 */
export async function MortgageProgramPage({
  programId,
}: {
  programId: MortgageProgramId;
}) {
  const { items } = await catalog.list({ siteCode: SITE.code });
  const program = getMortgageProgram(programId);

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
          {/* Название берём как есть: приведение к нижнему регистру ломало
              аббревиатуру — в крошке выходило «Ипотека — it». */}
          <span aria-current="page">
            {copy.mortgage} — {program.label}
          </span>
        </nav>
      }
    >
      <main>
        <MortgagePageContent projects={items} initialProgramId={programId} />
      </main>
    </SiteChrome>
  );
}
