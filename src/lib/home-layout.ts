import type { LayoutBlock } from "../components/block-renderer";
import { countBySeries } from "./catalog/projects";
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
  /* Числа считаются из public/catalog, пока нет CMS. */
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
        count: countBySeries("panel"),
      },
      {
        id: "barn",
        title: copy.seriesBarn,
        href: "/catalog?series=barn",
        image: "/series/barn.jpg",
        count: countBySeries("barn"),
      },
      {
        id: "classic",
        title: copy.seriesClassic,
        href: "/catalog?series=classic",
        image: "/series/classic.jpg",
        count: countBySeries("classic"),
      },
      {
        id: "modular",
        title: copy.seriesModular,
        href: "/catalog?series=modular",
        image: "/series/modular.jpg",
        count: countBySeries("modular"),
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
    /* Главный выход — запись на экскурсию: это действие, а не чтение.
       Страница завода остаётся второй ссылкой рядом. Оба выхода нужны
       здесь, а не только в баннере: лента слотов крутится, и слот про
       завод человек может не увидеть вовсе. */
    ctaLabel: copy.factoryTour,
    ctaHref: "/#contacts",
    moreLabel: copy.factoryMore,
    moreHref: "/manufacture",
    theme: "light",
  },
  {
    blockType: "mortgageShowcase",
  },
  /* Редизайн блоков со старого avgst.ru: независимый обзор канала
     и видеоотзывы семей — сразу после ипотеки, до контактов. */
  {
    blockType: "independentReview",
  },
  {
    blockType: "videoTestimonials",
  },
  /* Реферальная программа сразу после историй — чересполосица: отзывы muted, реферал белый. */
  {
    blockType: "referralProgram",
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
