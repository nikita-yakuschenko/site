import { copy } from "../copy";
import type { MortgageProgramId } from "./programs";

/**
 * Блоки, описывающие саму программу: они есть не у всех.
 *
 * Поля перечислены руками, а не сняты с семейной копии через Pick. Копия
 * объявлена константой, и Pick приносил из неё литеральные типы вместе с
 * длинами массивов: у семейной пять вопросов — и у остальных программ
 * могло быть ровно пять, слово в слово тех же. Здесь описана форма, а
 * содержимое каждая программа приносит своё.
 */
type ProgramBlocks = {
  whoEyebrow: string;
  whoHeading: string;
  whoLead: string;
  /* Слово между условиями. У семейной достаточно любого одного — «или».
     У IT все требования выполняются одновременно — «и». Разделитель
     говорит это прямо в ряду, а не только в тексте над ним. */
  whoJoiner: string;
  /* Требование к участнику: надзаголовок, крупная строка, мерка под ней и
     предметный кадр — та же анатомия, что у плашки программы. */
  whoFits: readonly {
    label: string;
    title: string;
    note: string;
    image: string;
    imageW: number;
    imageH: number;
    sizes: string;
    /* Имя правила, в котором лежат подробности этого условия. Плашка с ним
       становится нажимаемой: раскрывает правило и зажигает в нём нужную
       формулировку. */
    opensRule?: string;
  }[];
  rulesHeading: string;
  rules: readonly {
    /* Имя правила: по нему на него ссылается условие. Без имени правило
       живёт по порядковому номеру, и ссылаться на него нельзя. */
    id?: string;
    title: string;
    text: string;
    /* Отрезок текста, который загорается при переходе из условия. Задан
       дословно, а не границами: правка текста сдвинула бы номера символов
       и мазок лёг бы по середине слова. */
    highlight?: string;
  }[];
  conditionsEyebrow: string;
  conditionsHeading: string;
  /* Строка спецификации: значение слева, раскрытие справа. Значение может
     быть пустым — тогда вместо него встаёт предметный знак. */
  conditions: readonly {
    value: string;
    title: string;
    text: string;
    points: readonly string[];
  }[];
  conditionsNote: string;
  faqEyebrow: string;
  faqHeading: string;
  faq: readonly { question: string; answer: string }[];
};

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
  /* Изображение первого экрана. У семейной это фотография, у остальных —
     тот же предметный знак, которым программа обозначена в карточках:
     ноутбук, колосья, здание банка. Знак вписывается в кадр целиком, а
     фотография заполняет его — отсюда признак cutout. */
  heroImage: string;
  heroCutout?: boolean;
  /* Кадр приглашения внизу страницы. Он перекликается с первым экраном:
     у семейной там фотография семьи, у остальных — тот же предметный знак,
     которым программа обозначена наверху. Прежде кадр был зашит в
     компонент, и на всех четырёх страницах стояла семья. */
  midCtaImage: string;
  midCtaCutout?: boolean;
} & Partial<ProgramBlocks>;

export type WithWho = MortgageContent &
  Required<
    Pick<
      ProgramBlocks,
      | "whoEyebrow"
      | "whoHeading"
      | "whoLead"
          | "whoFits"
      | "rulesHeading"
      | "rules"
    >
  >;

export type WithConditions = MortgageContent &
  Required<
    Pick<
      ProgramBlocks,
      "conditionsEyebrow" | "conditionsHeading" | "conditions" | "conditionsNote"
    >
  >;

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
