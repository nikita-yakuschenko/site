import type {
  ComparisonSection,
  PackageId,
  SpecificationValue,
  TechnicalElement,
  TechnicalMatrix,
  TechnicalInfo,
} from "./types";

const included = (
  displayValue = "",
  material: string | null = null,
  completionLevel: SpecificationValue["completionLevel"] = null,
  variant: string | null = null,
): SpecificationValue => ({
  status: "included",
  displayValue,
  material,
  completionLevel,
  variant,
  technicalDetails: [],
  sourceStatus: "confirmed",
});
const excluded = (): SpecificationValue => ({
  ...included(),
  status: "excluded",
});
const architectural = () =>
  included("Согласно проекту", null, null, "architectural");
const metalDoor = () => included("Металлическая дверь с терморазрывом", "Металлическая дверь с терморазрывом", null, "thermal-break");
const roughFloor = () =>
  included("Черновое: OSB-3 22 мм", "OSB-3 22 мм", "rough");

type Row = [
  id: string,
  label: string,
  mobileLabel: string,
  icon: string,
  summary: string,
  facts: string[],
  qualifiers: string[],
];
// These descriptions explain an element. Package execution lives exclusively in each technology's own matrix.
const descriptions: Record<string, Row> = {
  wall: [
    "wall",
    "Стеновые панели",
    "Стеновые панели",
    "wall",
    "",
    [
      "Доска 45×140 мм, сухая, строганная",
      "Утепление по каркасу",
      "Ветрозащитный лист GTS9, толщиной 12,5 мм",
      "Пароизоляция (ПВХ-плёнка, 200 мкм)",
      "Контрбрус 45×45 мм, сухой, строганый",
    ],
    [],
  ],
  roofFrame: [
    "roofFrame",
    "Кровельные панели или фермы",
    "Кровельные панели или фермы",
    "roof",
    "",
    [
      "Доска 45×190 мм, сухая, строганная",
      "Утепление по каркасу",
      "Пароизоляция (ПВХ-плёнка, 200 мкм)",
      "Ветрозащитная мембрана",
      "Контрбрус 45×45 мм, сухой, строганый",
      "Обрешётка 20 мм",
    ],
    [],
  ],
  base: [
    "base",
    "Цокольные панели",
    "Цокольные панели",
    "layers",
    "",
    [
      "Доска 45×190 мм, сухая, строганная",
      "Утепление по каркасу",
      "Ветрозащитная мембрана",
      "Пароизоляция (ПВХ-плёнка, 200 мкм)",
      "OSB-3 толщиной 22 мм",
    ],
    [],
  ],
  partitions: [
    "partitions",
    "Внутренние перегородки",
    "Перегородки",
    "layout",
    "",
    ["Доска 45×90 мм, сухая, строганная", "Утепление по каркасу"],
    [],
  ],
  interfloor: [
    "interfloor",
    "Межэтажные перекрытия",
    "Межэтажные перекрытия",
    "layers",
    "",
    ["Утепление по каркасу"],
    [],
  ],
  roofing: [
    "roofing",
    "Профлист или металлочерепица",
    "Материал кровли",
    "home",
    "",
    [
      "Профилированный лист или металлочерепица согласно проекту",
      "Толщина металла 0,45 мм",
    ],
    [],
  ],
  windows: [
    "windows",
    "Окна",
    "Окна",
    "window",
    "",
    ["Профиль Rehau 70 мм", "Двухкамерный мультифункциональный стеклопакет"],
    [],
  ],
  doors: [
    "doors",
    "Входные двери",
    "Входные двери",
    "door",
    "",
    [],
    [],
  ],
  facade: [
    "facade",
    "Фасадная отделка",
    "Фасадная отделка",
    "building",
    "",
    ["Планкен, имитация бруса или профилированный лист согласно проекту"],
    [],
  ],
  facadePaint: [
    "facadePaint",
    "Покраска фасадной отделки",
    "Покраска фасада",
    "paint",
    "",
    [],
    [],
  ],
  wallsFinish: [
    "wallsFinish",
    "Отделка стен",
    "Отделка стен",
    "brush",
    "",
    [],
    [],
  ],
  ceiling: [
    "ceiling",
    "Отделка потолков",
    "Отделка потолков",
    "ceiling",
    "",
    [],
    [],
  ],
  floor: [
    "floor",
    "Напольное покрытие",
    "Напольное покрытие",
    "floor",
    "",
    [],
    [],
  ],
  bathroom: [
    "bathroom",
    "Отделка санузлов",
    "Отделка санузлов",
    "bath",
    "",
    [],
    [],
  ],
  electric: ["electric", "Электрика", "Электрика", "bolt", "", [], []],
  water: ["water", "Водоснабжение", "Водоснабжение", "drop", "", [], []],
  sewer: ["sewer", "Канализация", "Канализация", "pipe", "", [], []],
  heating: ["heating", "Отопление", "Отопление", "temperature", "", [], []],
  ventilation: ["ventilation", "Вентиляция", "Вентиляция", "wind", "", [], []],
  terrace: [
    "terrace",
    "Терраса",
    "Терраса",
    "terrace",
    "",
    ["Для проектного исполнения указана палубная доска с машинной покраской"],
    [],
  ],
  delivery: ["delivery", "Доставка", "Доставка", "truck", "", [], []],
  assembly: ["assembly", "Сборка", "Сборка", "tools", "", [], []],
};
const sectionDefinitions = [
  [
    "structure",
    "Силовой (несущий) каркас",
    ["wall", "roofFrame", "base", "partitions", "interfloor"],
  ],
  ["roof", "Кровельное покрытие", ["roofing"]],
  ["openings", "Окна и входные двери", ["windows", "doors"]],
  ["facade", "Фасадная отделка", ["facade", "facadePaint"]],
  [
    "interior",
    "Внутренняя отделка",
    ["wallsFinish", "ceiling", "floor", "bathroom"],
  ],
  [
    "engineering",
    "Инженерные системы",
    ["electric", "water", "sewer", "heating", "ventilation"],
  ],
  [
    "additional",
    "Дополнительные конструкции и работы",
    ["terrace", "delivery", "assembly"],
  ],
] as const;

type Values = Record<
  string,
  readonly [SpecificationValue, SpecificationValue, SpecificationValue]
>;
function sections(
  ids: readonly PackageId[],
  values: Values,
): ComparisonSection[] {
  return sectionDefinitions.map(([id, title, keys]) => ({
    id,
    title,
    elements: keys.map((key) => {
      const [
        elementId,
        label,
        mobileLabel,
        icon,
        summary,
        technicalFacts,
        qualifiers,
      ] = descriptions[key]!;
      // Own copies keep the two CMS-ready matrices independent, including explanations.
      const info = {
        title: label,
        summary,
        technicalFacts: [...technicalFacts],
        qualifiers: [...qualifiers],
      };
      return {
        id: elementId,
        label,
        mobileLabel,
        icon,
        info,
        values: Object.fromEntries(
          ids.map((packageId, index) => [packageId, values[key]![index]!]),
        ),
      } satisfies TechnicalElement;
    }),
  }));
}

// Independent PANEL matrix: start / standard / project. Never derived from the modular values.
const panelValues: Values = {
  wall: [
    included("Утеплённый каркас", "Доска 45×140 мм, сухая, строганная", "structural"),
    included("Утеплённый каркас", "Доска 45×140 мм, сухая, строганная", "structural"),
    included("Утеплённый каркас", "Доска 45×140 мм, сухая, строганная", "structural"),
  ],
  roofFrame: [
    included("Утепление по каркасу", "Доска 45×190 мм, сухая, строганная", "structural"),
    included("Утепление по каркасу", "Доска 45×190 мм, сухая, строганная", "structural"),
    included("Утепление по каркасу", "Доска 45×190 мм, сухая, строганная", "structural"),
  ],
  base: [
    included("OSB-3 22 мм, утепление по каркасу", "OSB-3 22 мм", "structural"),
    included("OSB-3 22 мм, утепление по каркасу", "OSB-3 22 мм", "structural"),
    included("OSB-3 22 мм, утепление по каркасу", "OSB-3 22 мм", "structural"),
  ],
  partitions: [
    included("Согласно проекту", "Доска 45×90 мм, сухая, строганная", "structural", "plan"),
    included("Согласно проекту", "Доска 45×90 мм, сухая, строганная", "structural", "plan"),
    included("Согласно проекту", "Доска 45×90 мм, сухая, строганная", "structural", "plan"),
  ],
  interfloor: [
    included("Каркас, утепление по каркасу", null, "structural", "insulation200"),
    included("Каркас, утепление по каркасу", null, "structural", "insulation200"),
    included("Каркас, утепление по каркасу", null, "structural", "insulation200"),
  ],
  roofing: [excluded(), architectural(), architectural()],
  windows: [
    excluded(),
    included("Базовые, 1,2×1 м", "Rehau 70 мм", null, "basic"),
    included("Согласно проекту", "Rehau 70 мм", null, "architectural"),
  ],
  doors: [
    excluded(),
    metalDoor(),
    metalDoor(),
  ],
  facade: [excluded(), architectural(), architectural()],
  facadePaint: [
    excluded(),
    included(
      "Машинная покраска деревянной отделки",
      null,
      null,
      "facade-material",
    ),
    included(
      "Машинная покраска деревянной отделки",
      null,
      null,
      "facade-material",
    ),
  ],
  wallsFinish: [excluded(), excluded(), included("ГСП Vetonit Стронг, 15 мм", "ГСП Vetonit Стронг, 15 мм", "prepared")],
  ceiling: [excluded(), excluded(), excluded()],
  floor: [roughFloor(), roughFloor(), roughFloor()],
  bathroom: [excluded(), excluded(), included("ГСП Vetonit Аква Стронг, 15 мм", "ГСП Vetonit Аква Стронг, 15 мм", "prepared")],
  electric: [excluded(), excluded(), excluded()],
  water: [excluded(), excluded(), excluded()],
  sewer: [excluded(), excluded(), excluded()],
  heating: [excluded(), excluded(), excluded()],
  ventilation: [excluded(), excluded(), excluded()],
  terrace: [excluded(), excluded(), architectural()],
  delivery: [
    included("", null, null, "delivery50"),
    included("", null, null, "delivery50"),
    included("", null, null, "delivery50"),
  ],
  assembly: [included(), included(), included()],
};

// Independent MODULAR matrix: standard / project / turnkey.
const modularValues: Values = {
  wall: [
    included("Утеплённый каркас", "Доска 45×140 мм, сухая, строганная", "structural"),
    included("Утеплённый каркас", "Доска 45×140 мм, сухая, строганная", "structural"),
    included("Утеплённый каркас", "Доска 45×140 мм, сухая, строганная", "structural"),
  ],
  roofFrame: [
    included("Утепление по каркасу", "Доска 45×190 мм, сухая, строганная", "structural"),
    included("Утепление по каркасу", "Доска 45×190 мм, сухая, строганная", "structural"),
    included("Утепление по каркасу", "Доска 45×190 мм, сухая, строганная", "structural"),
  ],
  base: [
    included("OSB-3 22 мм, утепление по каркасу", "OSB-3 22 мм", "structural"),
    included("OSB-3 22 мм, утепление по каркасу", "OSB-3 22 мм", "structural"),
    included("OSB-3 22 мм, утепление по каркасу", "OSB-3 22 мм", "structural"),
  ],
  partitions: [
    included("Согласно проекту", "Доска 45×90 мм, сухая, строганная", "structural", "plan"),
    included("Согласно проекту", "Доска 45×90 мм, сухая, строганная", "structural", "plan"),
    included("Согласно проекту", "Доска 45×90 мм, сухая, строганная", "structural", "plan"),
  ],
  interfloor: [
    included("Каркас, утепление по каркасу", null, "structural", "insulation200"),
    included("Каркас, утепление по каркасу", null, "structural", "insulation200"),
    included("Каркас, утепление по каркасу", null, "structural", "insulation200"),
  ],
  roofing: [architectural(), architectural(), architectural()],
  windows: [
    included("Базовые, 1,2×1 м", "Rehau 70 мм", null, "basic"),
    included("Согласно проекту", "Rehau 70 мм", null, "architectural"),
    included("Согласно проекту", "Rehau 70 мм", null, "architectural"),
  ],
  doors: [
    metalDoor(),
    metalDoor(),
    metalDoor(),
  ],
  facade: [architectural(), architectural(), architectural()],
  facadePaint: [
    included(
      "Машинная покраска деревянной отделки",
      null,
      null,
      "facade-material",
    ),
    included(
      "Машинная покраска деревянной отделки",
      null,
      null,
      "facade-material",
    ),
    included(
      "Машинная покраска деревянной отделки",
      null,
      null,
      "facade-material",
    ),
  ],
  wallsFinish: [
    excluded(),
    included("ГСП Vetonit Стронг, 15 мм", "ГСП Vetonit Стронг, 15 мм", "prepared"),
    included(
      "Чистовая: имитация бруса",
      "Имитация бруса камерной сушки",
      "finish",
    ),
  ],
  ceiling: [
    excluded(),
    excluded(),
    included(
      "Чистовая: имитация бруса",
      "Имитация бруса камерной сушки",
      "finish",
    ),
  ],
  floor: [
    roughFloor(),
    roughFloor(),
    included("Чистовое: ламинат 33 класса", "Ламинат 33 класса", "finish"),
  ],
  bathroom: [
    excluded(),
    included("ГСП Vetonit Аква Стронг, 15 мм", "ГСП Vetonit Аква Стронг, 15 мм", "prepared"),
    included("Керамогранит", "Керамогранит", "finish"),
  ],
  electric: [
    excluded(),
    excluded(),
    included("Разводка и автоматика в щите", null, "finish"),
  ],
  water: [
    excluded(),
    excluded(),
    included("Внутренняя разводка", null, "finish"),
  ],
  sewer: [
    excluded(),
    excluded(),
    included("Внутренняя разводка", null, "finish"),
  ],
  heating: [
    excluded(),
    excluded(),
    included("Электроконвекторы", "Электрические конвекторы", "finish"),
  ],
  ventilation: [
    excluded(),
    excluded(),
    included("Приточные клапаны", "Приточные клапаны", "finish"),
  ],
  terrace: [excluded(), architectural(), architectural()],
  delivery: [
    included("", null, null, "delivery50"),
    included("", null, null, "delivery50"),
    included("", null, null, "delivery50"),
  ],
  assembly: [included(), included(), included()],
};
const panelIds = ["start", "standard", "project"] as const;
const modularIds = ["standard", "project", "turnkey"] as const;
export const panelMatrix: TechnicalMatrix = {
  buildingTechnology: "panel",
  label: "Панельно-каркасные дома",
  packageIds: panelIds,
  sections: sections(panelIds, panelValues),
};
export const modularMatrix: TechnicalMatrix = {
  buildingTechnology: "modular",
  label: "Модульные дома",
  packageIds: modularIds,
  sections: sections(modularIds, modularValues),
};
export const technicalMatrices = {
  panel: panelMatrix,
  modular: modularMatrix,
} as const;

export const includedDeliveryZones = {
  nn: { origin: "Нижнего Новгорода", distanceKm: 50 },
  msk: { origin: "Москвы", distanceKm: 50 },
} as const;

export function deliveryInfoForRegion(
  region: keyof typeof includedDeliveryZones,
): TechnicalInfo {
  const zone = includedDeliveryZones[region];
  return {
    title: "Доставка",
    summary: `Доставка включена в стоимость для объекта на удалении до ${zone.distanceKm} км от ${zone.origin}.`,
    technicalFacts: [],
    qualifiers: [],
  };
}
