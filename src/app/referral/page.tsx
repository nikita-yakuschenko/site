import { CMSStaticBlock } from '../../components/cms-static-content'
import type { Metadata } from "next";
import { ReferralRules } from "../../components/referral-rules";
import { SiteChrome } from "../../components/site-chrome";
import { copy, footerAboutFor } from "../../lib/copy";
import { SITE } from "../../lib/site";

export const metadata: Metadata = {
  title: copy.referralRulesTitle,
  description: copy.referralRulesLead,
};

/** Правила реферальной программы. */
export default function ReferralRulesPage() {
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
        <CMSStaticBlock cmsBlockKey="PagereferralSection0" scope={"/referral"}><section className="section legal-doc">
          <div className="section__inner legal-doc__inner">
            <ReferralRules data-cms-content-connected />
          </div>
        </section></CMSStaticBlock>
      </main>
    </SiteChrome>
  );
}
