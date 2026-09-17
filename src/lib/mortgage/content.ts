import { copy } from "../copy";
import type { MortgageProgramId } from "./programs";

type FamilyCopy = typeof copy.familyMortgage;

/** Блоки, описывающие саму программу: они есть не у всех. */
type ProgramBlocks = Pick<
  FamilyCopy,
  | "whoEyebrow"
  | "whoHeading"
  | "whoLead"
  | "whoFits"
  | "rules"
  | "conditionsEyebrow"
  | "conditionsHeading"
  | "conditions"
  | "faqEyebrow"
  | "faqHeading"
  | "faq"
>;

/**
 * Содержимое страницы программы.
 *
 * Четыре адреса — четыре самостоятельные страницы, а не одна с предвыбранной
 * программой: у каждой свой первый экран, свои условия и свои вопросы.
 *
 * Обязательная часть — то, что есть у любой программы: первый экран, полоса
 * условий и приглашение к разговору. Блоки про саму программу необязательны,
 * и страница показывает только те, для которых есть текст: выдумывать
 * правила государственных программ нельзя, а пустой раздел хуже отсутствия.
 *
 * Разделы «как это работает», «что можно оформить» и форма рассказывают о
 * работе компании, а не о программе, поэтому общие для всех четырёх страниц.
 */
export type MortgageContent = {
  /* Поля описаны строками, а не взяты из семейной копии через Pick: тексты
     объявлены как константы, и Pick принёс бы литеральные типы — «по
     семейной ипотеке под » вместо string, куда остальные программы уже не
     подставить. */
  headingLine: string;
  headingBefore: string;
  headingRate: string;
  lead: string;
  midCtaHeading: string;
  midCtaLead: string;
  metrics: readonly { label: string; value: string }[];
} & Partial<ProgramBlocks>;

export type WithWho = MortgageContent &
  Required<Pick<ProgramBlocks, "whoEyebrow" | "whoHeading" | "whoLead" | "whoFits" | "rules">>;

export type WithConditions = MortgageContent &
  Required<Pick<ProgramBlocks, "conditionsEyebrow" | "conditionsHeading" | "conditions">>;

export type WithFaq = MortgageContent &
  Required<Pick<ProgramBlocks, "faqEyebrow" | "faqHeading" | "faq">>;

export function hasWho(content: MortgageContent): content is WithWho {
  return Boolean(content.whoFits && content.rules);
}

export function hasConditions(content: MortgageContent): content is WithConditions {
  return Boolean(content.conditions);
}

export function hasFaq(content: MortgageContent): content is WithFaq {
  return Boolean(content.faq);
}

const MORTGAGE_CONTENT: Record<MortgageProgramId, MortgageContent> = {
  family: copy.familyMortgage,
  it: copy.itMortgage,
  rural: copy.ruralMortgage,
  market: copy.marketMortgage,
};

export function mortgageContent(id: MortgageProgramId): MortgageContent {
  return MORTGAGE_CONTENT[id];
}
