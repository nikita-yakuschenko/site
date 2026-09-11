import type { LayoutBlock } from '../components/block-renderer'
import { copy } from './copy'

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
    blockType: 'hero',
    heading: copy.heroHeadline,
    description: copy.heroText,
    theme: 'dark',
    size: 'large',
    primaryAction: { label: copy.consult, href: '/#contacts' },
    secondaryAction: { label: copy.catalogCta, href: '/catalog' },
  },
  {
    blockType: 'popularProjects',
    eyebrow: copy.popularEyebrow,
    heading: copy.popularHeading,
    catalogHref: '/catalog',
    catalogLabel: copy.allProjects,
  },
  {
    blockType: 'productionSection',
    eyebrow: copy.production,
    heading: copy.productionHeading,
    body: copy.productionBody,
    items: copy.productionItems.map((label) => ({ label })),
    ctaLabel: copy.factoryTour,
    ctaHref: '/#contacts',
    theme: 'light',
  },
  {
    blockType: 'contactsSection',
    heading: copy.contacts,
    body: copy.contactsBody,
    useSiteContacts: true,
  },
  {
    blockType: 'leadForm',
    heading: copy.haveQuestion,
    body: copy.haveQuestionBody,
    submitLabel: copy.askQuestion,
  },
]
