"use client";

import { IconCheck, IconMinus, IconQuestionMark } from "@tabler/icons-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../ui/dialog";
import { ProjectPassportConcept } from "../project-passport-concept";
import { nbspText } from "../../lib/copy";
import type { CatalogProject } from "../../lib/catalog/types";
import { deliveryInfoForRegion, technicalMatrices } from "./model/data";
import type { PackageId, SpecificationValue, TechnicalElement, TechnicalMatrix } from "./model/types";
import "./comparison.css";

const text = (value: string) =>
  nbspText(nbspText(value.replace(/(?:согласно|по) архитектурному проекту/gi, "согласно проекту")));

const PACKAGE_IDS = ["start", "standard", "project", "turnkey"] as const;

export function isDescribedPackage(id: string): id is PackageId {
  return (PACKAGE_IDS as readonly string[]).includes(id);
}

export function packageCanBeDescribed(technology: CatalogProject["technology"], id: string): id is PackageId {
  if (!isDescribedPackage(id)) return false;
  const matrix = technicalMatrices[technology];
  return matrix.sections.some((section) => section.elements.some((element) => element.values[id]));
}


function sectionsForPackage(
  matrix: TechnicalMatrix,
  packageId: PackageId,
  floors: number,
  region: "nn" | "msk",
) {
  return matrix.sections
    .map((section) => ({
      ...section,
      elements: section.elements
        .filter((element) => element.id !== "interfloor" || floors !== 1)
        .map((element) =>
          element.id === "delivery" ? { ...element, info: deliveryInfoForRegion(region) } : element,
        )
        .filter((element) => element.values[packageId]),
    }))
    .filter((section) => section.elements.length > 0);
}

function PackageItem({ element, value }: { element: TechnicalElement; value: SpecificationValue }) {
  const included = value.status === "included";
  const StatusIcon = value.status === "included" ? IconCheck : value.status === "requiresVerification" ? IconQuestionMark : IconMinus;
  const statusLabel = {
    included: "Входит",
    excluded: "Не входит",
    notApplicable: "Не применяется",
    requiresVerification: "Уточняется",
  }[value.status];
  const line = included && value.completionLevel !== "structural" ? value.displayValue : "";
  const extra = included ? value.technicalDetails.filter((item) => item && item !== line) : [];
  const facts = included ? element.info.technicalFacts : [];
  const summary = included ? element.info.summary : "";
  const qualifiers = included ? element.info.qualifiers : [];
  const hasBody = Boolean(line) || extra.length > 0 || facts.length > 0 || Boolean(summary) || qualifiers.length > 0;
  return (
    <article className="package-description__item" data-status={value.status}>
      <h4>{text(element.label)}</h4>
      <p className="package-description__status">
        <StatusIcon size={18} aria-hidden="true" />
        <span>{statusLabel}</span>
      </p>
      {hasBody && (
        <div className="package-description__body">
          {(line || extra.length > 0) && (
            <ul>
              {line ? <li>{text(line)}</li> : null}
              {extra.map((item) => <li key={item}>{text(item)}</li>)}
            </ul>
          )}
          {summary ? <p>{text(summary)}</p> : null}
          {facts.length > 0 && (
            <>
              <b>Технические характеристики</b>
              <ul>
                {facts.map((fact) => <li key={fact}>{text(fact)}</li>)}
              </ul>
            </>
          )}
          {qualifiers.map((qualifier) => <p key={qualifier}>{text(qualifier)}</p>)}
        </div>
      )}
    </article>
  );
}

export function PackageDescriptionBody({
  matrix,
  packageId,
  floors,
  region,
}: {
  matrix: TechnicalMatrix;
  packageId: PackageId;
  floors: number;
  region: "nn" | "msk";
}) {
  const sections = sectionsForPackage(matrix, packageId, floors, region);
  return (
    <>
      {sections.map((section) => (
        <section key={section.id} className="package-description__section">
          <h3>{section.title}</h3>
          {section.elements.map((element) => (
            <PackageItem key={element.id} element={element} value={element.values[packageId]!} />
          ))}
        </section>
      ))}
    </>
  );
}

export function PackageDescriptionDialog({
  open,
  onOpenChange,
  project,
  packageId,
  packageName,
  region,
  specialPrice,
  mortgagePrice,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: CatalogProject;
  packageId: PackageId;
  packageName: string;
  region: "nn" | "msk";
  specialPrice: string | null;
  mortgagePrice: string | null;
}) {
  const matrix = technicalMatrices[project.technology];
  const sections = sectionsForPackage(matrix, packageId, project.floorsValue, region);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="package-description-dialog" closeLabel="Закрыть описание">
        <div className="comparison-passport">
          <ProjectPassportConcept project={project.name} projectSlug={project.slug} placement="comparison" active={open} />
        </div>
        <div className="comparison-shell package-description">
          <header className="comparison-heading package-description__heading">
            <p className="package-description__kicker">Комплектация</p>
            <DialogTitle>{packageName}</DialogTitle>
            {(specialPrice || mortgagePrice) && (
              <p className="package-description__prices">
                {specialPrice ? <span>Спец. цена: <b>{specialPrice}</b></span> : null}
                {mortgagePrice ? <span>Цена в ипотеку: <b>{mortgagePrice}</b></span> : null}
              </p>
            )}
            <DialogDescription>{matrix.label} · {project.name}</DialogDescription>
          </header>
          <div className="comparison-scroll">
            {sections.map((section) => (
              <section key={section.id} className="package-description__section">
                <h3>{section.title}</h3>
                {section.elements.map((element) => (
                  <PackageItem key={element.id} element={element} value={element.values[packageId]!} />
                ))}
              </section>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
