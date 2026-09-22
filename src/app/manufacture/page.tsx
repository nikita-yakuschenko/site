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
        <section className="section manufacture-beam" aria-labelledby="manufacture-beam-title">
          <div className="section__inner manufacture-beam__inner">
            <figure className="manufacture-beam__visual">
              <Image
                src="/production/wbz150-perspective.webp"
                alt="Балочный центр WEINMANN WBZ 150 с подающими рольгангами"
                width={1600}
                height={1200}
                sizes="(max-width: 719px) 100vw, 58vw"
              />
            </figure>
            <h2 id="manufacture-beam-title">{copy.productionBeamTitle}</h2>
            <div className="manufacture-beam__copy">
              <p>{copy.productionBeamLead}</p>
              <p>{copy.productionBeamDetail}</p>
            </div>
          </div>
        </section>
        <section className="section manufacture-cutting" aria-labelledby="manufacture-cutting-title">
          <div className="section__inner manufacture-cutting__inner">
            <h2 id="manufacture-cutting-title">{copy.productionCuttingTitle}</h2>
            <div className="manufacture-cutting__copy">
              <p>{copy.productionCuttingLead}</p>
              <p>{copy.productionCuttingDetail}</p>
            </div>
            <figure className="manufacture-cutting__visual">
              <Image
                src="/production/svp950-overall.webp"
                alt="Вертикальный форматно-раскроечный станок SVP 950 ECO"
                width={1800}
                height={1200}
                sizes="(max-width: 719px) 100vw, 58vw"
              />
            </figure>
          </div>
        </section>
      </main>
    </SiteChrome>
  );
}
