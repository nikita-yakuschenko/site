import type {
  ComparisonSection,
  PackageId,
  SpecificationValue,
  TechnicalElement,
  TechnicalMatrix,
} from "./types";

const included = (
  displayValue = "Включено",
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
  ...included("Не входит"),
  status: "excluded",
});
const architectural = () =>
  included("Согласно проекту", null, null, "architectural");
const roughFloor = () =>
  included("Черновое · OSB-3 22 мм", "OSB-3 22 мм", "rough");

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
    "Утеплённые панели наружных стен, изготовленные на производстве.",
    [
      "Стойки из сухой строганой доски 45×140 мм",
      "Утепление 150 мм",
      "Наружный лист GTS 12,5 мм",
      "Контрбрус 45 мм для вентиляции фасада",
    ],
    [],
  ],
  roofFrame: [
    "roofFrame",
    "Кровельные панели и фермы",
    "Панели и фермы кровли",
    "roof",
    "Несущая утеплённая конструкция крыши. Кровельное покрытие сравнивается отдельно.",
    [
      "Доска 190 мм, утепление 200 мм",
      "Пароизоляция изнутри, ветрозащита снаружи",
      "Контробрешётка 45 мм, обрешётка 20 мм",
    ],
    [],
  ],
  base: [
    "base",
    "Цокольные панели",
    "Цокольные панели",
    "layers",
    "Утеплённое основание дома с конструктивным настилом пола.",
    [
      "Доска 190 мм, утепление 200 мм",
      "Ветрозащита снизу, пароизоляция 200 мкм",
      "OSB-3 толщиной 22 мм",
    ],
    [],
  ],
  partitions: [
    "partitions",
    "Внутренние перегородки",
    "Перегородки",
    "layout",
    "Перегородки разделяют внутреннее пространство дома.",
    ["Внутреннее утепление по толщине каркаса"],
    [],
  ],
  interfloor: [
    "interfloor",
    "Межэтажные перекрытия",
    "Межэтажные перекрытия",
    "layers",
    "Каркас межэтажного перекрытия с утеплением 200 мм.",
    ["Утепление 200 мм"],
    [],
  ],
  roofing: [
    "roofing",
    "Материал покрытия",
    "Материал кровли",
    "home",
    "Наружное покрытие защищает конструкцию крыши от осадков.",
    [
      "Профилированный лист или металлочерепица согласно проекту",
      "Толщина металла 0,45 мм",
    ],
    [],
  ],
  roofPaint: [
    "roofPaint",
    "Защитно-декоративное покрытие",
    "Покрытие металла",
    "shield",
    "Заводской защитный и декоративный слой кровельного металла.",
    ["Заводское покрытие"],
    [],
  ],
  windows: [
    "windows",
    "Окна",
    "Окна",
    "window",
    "В базовом исполнении используются типовые окна; в проектном - размеры и конфигурация согласно проекту.",
    [
      "Профиль Rehau 70 мм",
      "Двухкамерный мультифункциональный стеклопакет",
      "Базовый размер 1×1,2 м",
    ],
    ["Размеры и количество проверяются по проекту."],
  ],
  doors: [
    "doors",
    "Входные двери",
    "Входные двери",
    "door",
    "Техническая дверь закрывает входной проём. В проектном исполнении предусмотрены входные двери согласно проекту.",
    [
      "Входная дверь с терморазрывом",
      "Для проектного исполнения доступен выбор из предложенных дизайнов",
    ],
    [],
  ],
  facade: [
    "facade",
    "Фасадная отделка",
    "Фасадная отделка",
    "building",
    "Фасадная отделка формирует внешний вид дома.",
    ["Планкен, имитация бруса или профилированный лист согласно проекту"],
    [],
  ],
  facadePaint: [
    "facadePaint",
    "Покраска фасадной отделки",
    "Покраска фасада",
    "paint",
    "Деревянная фасадная отделка окрашивается на производстве.",
    ["Машинная покраска деревянной отделки"],
    [
      "Для металлической фасадной отделки применяется заводское покрытие. Подарки и условия оплаты показываются отдельно от технического состава.",
    ],
  ],
  wallsFinish: [
    "wallsFinish",
    "Отделка стен",
    "Отделка стен",
    "brush",
    "Сравнивается уровень готовности внутренних стен и материал их отделки.",
    [],
    [
      "Чистовая деревянная отделка выполняется по своей технологии, без предварительного монтажа и демонтажа гипсокартона.",
    ],
  ],
  ceiling: [
    "ceiling",
    "Отделка потолков",
    "Отделка потолков",
    "ceiling",
    "Самостоятельная отделка потолков, отдельно от конструкции кровли.",
    [],
    [],
  ],
  floor: [
    "floor",
    "Напольное покрытие",
    "Напольное покрытие",
    "floor",
    "Черновой настил и финишный пол - разные уровни готовности, а не отсутствие и наличие пола.",
    ["Конструктивное основание: OSB-3 22 мм"],
    [],
  ],
  bathroom: [
    "bathroom",
    "Отделка санузлов",
    "Отделка санузлов",
    "bath",
    "Материал внутренней отделки влажных помещений зависит от комплектации.",
    [],
    [],
  ],
  electric: [
    "electric",
    "Электрика",
    "Электрика",
    "bolt",
    "Внутренняя электропроводка и автоматика в щите.",
    [],
    [],
  ],
  water: [
    "water",
    "Водоснабжение",
    "Водоснабжение",
    "drop",
    "Внутренняя разводка и подключение к выводам дома.",
    [],
    [],
  ],
  sewer: [
    "sewer",
    "Канализация",
    "Канализация",
    "pipe",
    "Внутренняя канализационная разводка и подключение к выводам дома.",
    [],
    [],
  ],
  heating: [
    "heating",
    "Отопление",
    "Отопление",
    "temperature",
    "Электрические конвекторы с управлением в каждой комнате.",
    [],
    [],
  ],
  ventilation: [
    "ventilation",
    "Вентиляция",
    "Вентиляция",
    "wind",
    "Приточные клапаны обеспечивают подачу наружного воздуха.",
    [],
    [],
  ],
  terrace: [
    "terrace",
    "Терраса",
    "Терраса",
    "terrace",
    "Терраса согласно проекту, как на визуализациях дома.",
    ["Для проектного исполнения указана палубная доска с машинной покраской"],
    [],
  ],
  delivery: [
    "delivery",
    "Доставка",
    "Доставка",
    "truck",
    "В стоимость дома включена доставка в указанной для региона и комплектации зоне.",
    [],
    [],
  ],
  assembly: [
    "assembly",
    "Сборка",
    "Сборка",
    "tools",
    "Монтаж дома выполняют специалисты «Авангард Строй».",
    [],
    [],
  ],
};
const sectionDefinitions = [
  [
    "structure",
    "Силовой (несущий) каркас",
    ["wall", "roofFrame", "base", "partitions", "interfloor"],
  ],
  ["roof", "Кровельное покрытие", ["roofing", "roofPaint"]],
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
  technology: "panel" | "modular",
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
      if (
        technology === "panel" &&
        [
          "wallsFinish",
          "ceiling",
          "bathroom",
          "electric",
          "water",
          "sewer",
          "heating",
          "ventilation",
        ].includes(key)
      ) {
        info.summary = ["wallsFinish", "ceiling", "bathroom"].includes(key)
          ? "Внутренняя отделка не входит в панельно-каркасные комплектации."
          : "Инженерные работы не входят в панельно-каркасные комплектации.";
        info.technicalFacts = [];
        info.qualifiers = [];
      }
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
    included(
      "Утеплённый каркас",
      "Доска 45×140 мм, утепление 150 мм",
      "structural",
    ),
    included(
      "Утеплённый каркас",
      "Доска 45×140 мм, утепление 150 мм",
      "structural",
    ),
    included(
      "Утеплённый каркас",
      "Доска 45×140 мм, утепление 150 мм",
      "structural",
    ),
  ],
  roofFrame: [
    included("Утепление 200 мм", "Доска 190 мм", "structural"),
    included("Утепление 200 мм", "Доска 190 мм", "structural"),
    included("Утепление 200 мм", "Доска 190 мм", "structural"),
  ],
  base: [
    included("OSB-3 22 мм, утепление 200 мм", "OSB-3 22 мм", "structural"),
    included("OSB-3 22 мм, утепление 200 мм", "OSB-3 22 мм", "structural"),
    included("OSB-3 22 мм, утепление 200 мм", "OSB-3 22 мм", "structural"),
  ],
  partitions: [
    included("Согласно проекту", null, "structural", "plan"),
    included("Согласно проекту", null, "structural", "plan"),
    included("Согласно проекту", null, "structural", "plan"),
  ],
  interfloor: [
    included("Каркас, утепление 200 мм", null, "structural", "insulation200"),
    included("Каркас, утепление 200 мм", null, "structural", "insulation200"),
    included("Каркас, утепление 200 мм", null, "structural", "insulation200"),
  ],
  roofing: [excluded(), architectural(), architectural()],
  roofPaint: [
    excluded(),
    included("Заводское покрытие", null, null, "factory"),
    included("Заводское покрытие", null, null, "factory"),
  ],
  windows: [
    excluded(),
    included("Базовые, 1×1,2 м", "Rehau 70 мм", null, "basic"),
    included("Согласно проекту", "Rehau 70 мм", null, "architectural"),
  ],
  doors: [
    excluded(),
    included("Техническая входная дверь", null, null, "technical"),
    architectural(),
  ],
  facade: [excluded(), architectural(), architectural()],
  facadePaint: [
    excluded(),
    included("По материалу фасада", null, null, "facade-material"),
    included("По материалу фасада", null, null, "facade-material"),
  ],
  wallsFinish: [excluded(), excluded(), excluded()],
  ceiling: [excluded(), excluded(), excluded()],
  floor: [roughFloor(), roughFloor(), roughFloor()],
  bathroom: [excluded(), excluded(), excluded()],
  electric: [excluded(), excluded(), excluded()],
  water: [excluded(), excluded(), excluded()],
  sewer: [excluded(), excluded(), excluded()],
  heating: [excluded(), excluded(), excluded()],
  ventilation: [excluded(), excluded(), excluded()],
  terrace: [excluded(), excluded(), architectural()],
  delivery: [
    included("Нижний Новгород и Москва: до 50 км", null, null, "nn50-msk50"),
    included("Нижний Новгород и Москва: до 50 км", null, null, "nn50-msk50"),
    included("Нижний Новгород и Москва: до 50 км", null, null, "nn50-msk50"),
  ],
  assembly: [included(), included(), included()],
};

// Independent MODULAR matrix: standard / project / turnkey.
const modularValues: Values = {
  wall: [
    included(
      "Утеплённый каркас",
      "Доска 45×140 мм, утепление 150 мм",
      "structural",
    ),
    included(
      "Утеплённый каркас",
      "Доска 45×140 мм, утепление 150 мм",
      "structural",
    ),
    included(
      "Утеплённый каркас",
      "Доска 45×140 мм, утепление 150 мм",
      "structural",
    ),
  ],
  roofFrame: [
    included("Утепление 200 мм", "Доска 190 мм", "structural"),
    included("Утепление 200 мм", "Доска 190 мм", "structural"),
    included("Утепление 200 мм", "Доска 190 мм", "structural"),
  ],
  base: [
    included("OSB-3 22 мм, утепление 200 мм", "OSB-3 22 мм", "structural"),
    included("OSB-3 22 мм, утепление 200 мм", "OSB-3 22 мм", "structural"),
    included("OSB-3 22 мм, утепление 200 мм", "OSB-3 22 мм", "structural"),
  ],
  partitions: [
    included("Согласно проекту", null, "structural", "plan"),
    included("Согласно проекту", null, "structural", "plan"),
    included("Согласно проекту", null, "structural", "plan"),
  ],
  interfloor: [
    included("Каркас, утепление 200 мм", null, "structural", "insulation200"),
    included("Каркас, утепление 200 мм", null, "structural", "insulation200"),
    included("Каркас, утепление 200 мм", null, "structural", "insulation200"),
  ],
  roofing: [architectural(), architectural(), architectural()],
  roofPaint: [
    included("Заводское покрытие", null, null, "factory"),
    included("Заводское покрытие", null, null, "factory"),
    included("Заводское покрытие", null, null, "factory"),
  ],
  windows: [
    included("Базовые, 1×1,2 м", "Rehau 70 мм", null, "basic"),
    included("Согласно проекту", "Rehau 70 мм", null, "architectural"),
    included("Согласно проекту", "Rehau 70 мм", null, "architectural"),
  ],
  doors: [
    included("Техническая входная дверь", null, null, "technical"),
    architectural(),
    architectural(),
  ],
  facade: [architectural(), architectural(), architectural()],
  facadePaint: [
    included("По материалу фасада", null, null, "facade-material"),
    included("По материалу фасада", null, null, "facade-material"),
    included("По материалу фасада", null, null, "facade-material"),
  ],
  wallsFinish: [
    excluded(),
    included("Гипсокартон 15 мм", "Гипсокартон 15 мм", "prepared"),
    included(
      "Чистовая · имитация бруса",
      "Имитация бруса камерной сушки",
      "finish",
    ),
  ],
  ceiling: [
    excluded(),
    excluded(),
    included(
      "Чистовая · имитация бруса",
      "Имитация бруса камерной сушки",
      "finish",
    ),
  ],
  floor: [
    roughFloor(),
    roughFloor(),
    included("Чистовое · ламинат 33 класса", "Ламинат 33 класса", "finish"),
  ],
  bathroom: [
    excluded(),
    included("Имитация бруса", "Имитация бруса", "finish"),
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
    included("Нижний Новгород и Москва: до 50 км", null, null, "nn50-msk50"),
    included("Нижний Новгород и Москва: до 50 км", null, null, "nn50-msk50"),
    included(
      "Нижний Новгород: до 50 км; Москва: до 600 км",
      null,
      null,
      "nn50-msk600",
    ),
  ],
  assembly: [included(), included(), included()],
};
const panelIds = ["start", "standard", "project"] as const;
const modularIds = ["standard", "project", "turnkey"] as const;
export const panelMatrix: TechnicalMatrix = {
  buildingTechnology: "panel",
  label: "Панельно-каркасные дома",
  packageIds: panelIds,
  sections: sections(panelIds, panelValues, "panel"),
};
export const modularMatrix: TechnicalMatrix = {
  buildingTechnology: "modular",
  label: "Модульные дома",
  packageIds: modularIds,
  sections: sections(modularIds, modularValues, "modular"),
};
export const technicalMatrices = {
  panel: panelMatrix,
  modular: modularMatrix,
} as const;
