"use client";

import { IconArrowUpRight, IconCheck, IconTrees } from "@tabler/icons-react";
import { useState } from "react";
import type { CatalogProject, ReadyHomeSection } from "../lib/catalog/types";
import { formatRub } from "../lib/locale";
import { SITE } from "../lib/site";
import { LeadForm } from "./lead-form";

export function ReadyHomeOffer({ project }: { project: CatalogProject }) {
  const ready = project.readyHome;
  const [formOpen, setFormOpen] = useState(false);
  if (!ready) return null;

  const sections = ready.sections ?? [];
  const flatItems = ready.configuration ?? [];

  return (
    <section className="section section--muted" aria-labelledby="ready-home-offer-title">
      <div className="section__inner">
        <h2 id="ready-home-offer-title">Комплектация готового дома</h2>

        <div className="ready-home-offer">
          <article className="ready-home-offer__details">
            <p>{ready.configurationLead}</p>

            {sections.length > 0 ? (
              <div className="ready-home-offer__sections">
                {sections.map((section) => (
                  <OfferSection key={section.title} section={section} />
                ))}
              </div>
            ) : flatItems.length > 0 ? (
              <ul className="ready-home-offer__flat">
                {flatItems.map((item) => (
                  <li key={item}>
                    <IconCheck size={16} stroke={2.4} aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </article>

          <aside className="ready-home-offer__total" data-form={formOpen ? "true" : "false"}>
            <div className="ready-home-offer__summary">
              <p>Цена продажи</p>
              <strong>{formatRub(ready.salePrice)}</strong>
              <span>{project.name}</span>
            </div>

            {formOpen ? (
              <LeadForm
                siteId={SITE.id}
                projectExternalId={project.id}
                variant="card"
                compact
                heading="Получить предложение"
                submitLabel="Получить предложение"
                meta={{
                  project: project.name,
                  location: ready.location,
                  price: ready.salePrice,
                  kind: "ready-home",
                }}
              />
            ) : (
              <button
                type="button"
                className="btn btn-yellow"
                onClick={() => setFormOpen(true)}
              >
                Получить предложение
                <IconArrowUpRight size={16} stroke={2} aria-hidden="true" />
              </button>
            )}
          </aside>
        </div>
      </div>
    </section>
  );
}

function OfferSection({ section }: { section: ReadyHomeSection }) {
  const Icon = section.tone === "place" ? IconTrees : IconCheck;

  return (
    <section
      className={
        section.tone === "place"
          ? "ready-home-offer__section ready-home-offer__section--place"
          : "ready-home-offer__section"
      }
    >
      <h3>{section.title}</h3>
      <ul className="ready-home-offer__points">
        {section.points.map((point) => (
          <li key={point.title}>
            <Icon size={18} stroke={2.2} aria-hidden="true" />
            <div>
              <p>{point.title}</p>
              {point.items?.length ? (
                <ul>
                  {point.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
