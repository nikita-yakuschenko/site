import type { Metadata } from "next";
import { IconArrowUpRight } from "@tabler/icons-react";
import Link from "next/link";
import Image from "next/image";
import { SiteChrome } from "../../components/site-chrome";
import { copy, footerAboutFor } from "../../lib/copy";
import { SITE } from "../../lib/site";

export const metadata: Metadata = {
  title: copy.productionTitle,
  description: copy.productionLead,
};

export default function ManufacturePage() {
  return (
    <SiteChrome
      name={SITE.name}
      phone={SITE.contacts.phone}
      email={SITE.contacts.email}
      address={SITE.contacts.address}
      navigation={[...SITE.navigation]}
      overlay
      footer={SITE.footer.legal}
      about={footerAboutFor(SITE.name)}
    >
      <main>
        <section className="hero manufacture-hero" aria-labelledby="manufacture-hero-title">
          <div className="manufacture-hero__scene" aria-hidden="true">
            <img
              className="hero__frame"
              src="/production/manufacture-hero-board.png"
              alt=""
            />
            <img
              className="manufacture-hero__mark"
              src="/production/avgst-machine-logo.svg"
              alt=""
            />
          </div>
          <div className="hero__tone" aria-hidden="true" />
          <div className="hero__stage">
            <div className="hero__copy">
              <h1 id="manufacture-hero-title">
                Производство Авангард Строй - место, где рождается ваш дом
              </h1>
              <p>{copy.productionLead}</p>
              <Link className="btn btn-yellow hero__cta" href="/#contacts">
                {copy.factoryTour}
                <IconArrowUpRight size={18} stroke={2} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
        <section className="section manufacture-documentation" aria-labelledby="manufacture-documentation-title">
          <div className="section__inner manufacture-documentation__inner">
            <h2 id="manufacture-documentation-title">
              {copy.productionDocumentationTitle}
            </h2>
            <div className="manufacture-documentation__copy">
              <p>{copy.productionDocumentationLead}</p>
              <p>{copy.productionDocumentationDetail}</p>
            </div>
            <figure className="manufacture-documentation__visual">
              <Image
                src="/production/construction-documentation.png"
                alt="Иллюстрация конструкторской документации каркасного дома: чертежи стен и узлов"
                width={1672}
                height={940}
                sizes="(max-width: 719px) 100vw, 58vw"
              />
            </figure>
          </div>
        </section>
      </main>
    </SiteChrome>
  );
}
