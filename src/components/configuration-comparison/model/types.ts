export type PackageId = "start" | "standard" | "project" | "turnkey";
export type BuildingTechnology = "panel" | "modular";
export type SpecificationValue = {
  status: "included" | "excluded" | "notApplicable" | "requiresVerification";
  completionLevel: "structural" | "rough" | "prepared" | "finish" | null;
  displayValue: string;
  material: string | null;
  technicalDetails: readonly string[];
  sourceStatus: "confirmed" | "needsVerification";
  variant: string | null;
};
export type TechnicalInfo = {
  title: string;
  summary: string;
  technicalFacts: readonly string[];
  qualifiers: readonly string[];
  optionalMedia?: { src: string; alt: string };
};
export type TechnicalElement = {
  id: string;
  label: string;
  mobileLabel: string;
  icon: string;
  info: TechnicalInfo;
  values: Partial<Record<PackageId, SpecificationValue>>;
};
export type ComparisonSection = {
  id: string;
  title: string;
  elements: readonly TechnicalElement[];
};
export type TechnicalMatrix = {
  buildingTechnology: BuildingTechnology;
  label: string;
  packageIds: readonly PackageId[];
  sections: readonly ComparisonSection[];
};

/** Display copy is deliberately excluded: differences describe physical execution. */
export function semanticValue(value: SpecificationValue): string {
  return JSON.stringify([
    value.status,
    value.completionLevel,
    value.material,
    [...value.technicalDetails].sort(),
    value.sourceStatus,
    value.variant,
  ]);
}
export function hasDifferences(
  element: TechnicalElement,
  ids: readonly PackageId[],
): boolean {
  return (
    new Set(
      ids.map((id) =>
        element.values[id] ? semanticValue(element.values[id]!) : "missing",
      ),
    ).size > 1
  );
}
