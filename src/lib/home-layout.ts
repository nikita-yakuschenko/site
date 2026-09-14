import type { LayoutBlock } from "../components/block-renderer";
import { copy } from "./copy";

/**
 * Раскладка главной страницы.
 *
 * Перенесена из сида ветки main без изменений: те же блоки, тот же порядок,
 * те же тексты. На main эта раскладка хранится в поле layout документа Pages
 * и редактируется в админке; здесь она зафиксирована в коде до подключения
 * CMS в AV4-10. Сами блоки рендерит общий BlockRenderer — механизм тот же,
 * временный только источник данных.
 */
export const HOME_LAYOUT: LayoutBlock[] = [
  {
    blockType: "hero",
    message: copy.hero,
    promos: copy.heroPromos,
  },
  /* Преимущества компании — отдельный блок, а не часть баннера. Они не
     меняются вместе со слайдами и говорят о компании, а не о кадре. */
  {
    blockType: "advantagesBar",
    items: copy.heroAdvantages,
  },
  {
    blockType: "popularProjects",
    eyebrow: copy.popularEyebrow,
    heading: copy.popularHeading,
    catalogHref: "/catalog",
    catalogLabel: copy.allProjects,
  },
  /* Числа из папок public/catalog, пока нет CMS. Барнхаусы 12,
     панельно-каркасные 14, классика 7, модульные 4. */
  {
    blockType: "seriesBento",
    heading: copy.seriesHeading,
    eyebrow: copy.seriesEyebrow,
    catalogHref: "/catalog",
    catalogLabel: copy.seriesAll,
    items: [
      {
        id: "panel",
        title: copy.seriesPanel,
        href: "/catalog?series=panel",
        image: "/series/panel.jpg",
        count: 14,
      },
      {
        id: "barn",
        title: copy.seriesBarn,
        href: "/catalog?series=barn",
        image: "/series/barn.jpg",
        count: 12,
      },
      {
        id: "classic",
        title: copy.seriesClassic,
        href: "/catalog?series=classic",
        image: "/series/classic.jpg",
        count: 7,
      },
      {
        id: "modular",
        title: copy.seriesModular,
        href: "/catalog?series=modular",
        image: "/series/modular.jpg",
        count: 4,
      },
    ],
  },
  {
    blockType: "productionSection",
    /* Снимок собственного цеха. Тот же кадр стоит у партнёров на
       domaizi.ru — фотография наша, они используют её по соглашению. */
    media: { url: "/production/factory.jpg" },
    mediaMobile: { url: "/production/factory-portrait.jpg" },
    eyebrow: copy.production,
    heading: copy.productionHeading,
    body: copy.productionBody,
    steps: copy.productionSteps,
    /* Два выхода из блока, и главный — переход на страницу производства.
       К записи на экскурсию человека возвращают многие места сайта, а
       позвать его почитать про завод больше негде: это единственный такой
       вход, и он забирает себе главную кнопку.

       Оба выхода нужны здесь, а не только в баннере: лента слотов
       крутится, и слот про завод человек может не увидеть вовсе. */
    ctaLabel: copy.factoryMore,
    ctaHref: "/manufacture",
    moreLabel: copy.factoryTour,
    moreHref: "/#contacts",
    theme: "light",
  },
  {
    blockType: "contactsSection",
    heading: copy.contacts,
    body: copy.contactsBody,
    useSiteContacts: true,
  },
  {
    blockType: "leadForm",
    heading: copy.haveQuestion,
    body: copy.haveQuestionBody,
    submitLabel: copy.askQuestion,
  },
];
