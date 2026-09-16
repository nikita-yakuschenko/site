import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";
import { SiteChrome } from "../../components/site-chrome";
import { CookieSettingsButton } from "../../consent/CookieSettingsButton";
import { copy, footerAboutFor } from "../../lib/copy";
import { renderMdDoc } from "../../lib/md-doc";
import { SITE } from "../../lib/site";

export const metadata: Metadata = {
  title: copy.cookiePolicyTitle,
  description: copy.cookiePolicyLead,
};

export default function CookiePolicyPage() {
  const source = readFileSync(
    join(process.cwd(), "docs/cookie-policy-final.md"),
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
        <section className="section legal-doc">
          <div className="section__inner legal-doc__inner">
            {renderMdDoc(source, {
              backHref: "/#footer",
              backLabel: "Вернуться на главную",
            })}
            <div className="legal-doc__consent-actions">
              <CookieSettingsButton />
            </div>
          </div>
        </section>
      </main>
    </SiteChrome>
  );
}
