import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";
import { SiteChrome } from "../../components/site-chrome";
import { copy, footerAboutFor } from "../../lib/copy";
import { renderMdDoc } from "../../lib/md-doc";
import { SITE } from "../../lib/site";

export const metadata: Metadata = {
  title: copy.personalDataTitle,
  description: copy.personalDataLead,
};

export default function PersonalDataPage() {
  const source = readFileSync(
    join(process.cwd(), "docs/politika_obrabotki_personalnyh_dannyh_final.md"),
    "utf8",
  );

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
    >
      <main>
        <article className="section legal-doc">
          <div className="section__inner legal-doc__inner">
            {renderMdDoc(source)}
          </div>
        </article>
      </main>
    </SiteChrome>
  );
}
