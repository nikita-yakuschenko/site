import type { Block } from 'payload'

const themeField = {
  name: 'theme',
  label: 'Тема',
  type: 'select' as const,
  required: true,
  defaultValue: 'dark',
  options: [
    { label: 'Светлая', value: 'light' },
    { label: 'Тёмная', value: 'dark' },
    { label: 'Брендовая', value: 'brand' },
  ],
}

const sizeField = {
  name: 'size',
  label: 'Размер',
  type: 'select' as const,
  required: true,
  defaultValue: 'standard',
  options: [
    { label: 'Компактный', value: 'compact' },
    { label: 'Обычный', value: 'standard' },
    { label: 'Крупный', value: 'large' },
  ],
}

export const HeroBlock: Block = {
  slug: 'hero',
  interfaceName: 'HeroBlock',
  labels: { singular: 'Первый экран', plural: 'Первые экраны' },
  fields: [
    { name: 'heading', label: 'Заголовок', type: 'text', required: true },
    { name: 'description', label: 'Описание', type: 'textarea' },
    { name: 'media', label: 'Изображение', type: 'upload', relationTo: 'media' },
    themeField,
    { ...sizeField, defaultValue: 'large' },
    {
      name: 'primaryAction',
      label: 'Основная кнопка',
      type: 'group',
      fields: [
        { name: 'label', label: 'Текст', type: 'text' },
        { name: 'href', label: 'Ссылка', type: 'text' },
      ],
    },
    {
      name: 'secondaryAction',
      label: 'Вторая кнопка',
      type: 'group',
      fields: [
        { name: 'label', label: 'Текст', type: 'text' },
        { name: 'href', label: 'Ссылка', type: 'text' },
      ],
    },
  ],
}

export const PopularProjectsBlock: Block = {
  slug: 'popularProjects',
  interfaceName: 'PopularProjectsBlock',
  labels: { singular: 'Популярные проекты', plural: 'Популярные проекты' },
  fields: [
    { name: 'eyebrow', label: 'Надзаголовок', type: 'text' },
    { name: 'heading', label: 'Заголовок', type: 'text', required: true },
    { name: 'catalogHref', label: 'Ссылка на каталог', type: 'text', defaultValue: '/projects' },
    { name: 'catalogLabel', label: 'Текст ссылки', type: 'text' },
    {
      name: 'projects',
      label: 'Проекты',
      type: 'relationship',
      relationTo: 'catalog',
      hasMany: true,
      admin: {
        description: 'Пусто — покажем проекты из каталога по умолчанию (первые по списку).',
      },
    },
  ],
}

export const TextSectionBlock: Block = {
  slug: 'textSection',
  interfaceName: 'TextSectionBlock',
  labels: { singular: 'Текстовый блок', plural: 'Текстовые блоки' },
  fields: [
    { name: 'heading', label: 'Заголовок', type: 'text' },
    { name: 'body', label: 'Текст', type: 'textarea', required: true },
  ],
}

export const CtaBlock: Block = {
  slug: 'cta',
  interfaceName: 'CtaBlock',
  labels: { singular: 'Призыв к действию', plural: 'Призывы к действию' },
  fields: [
    { name: 'heading', label: 'Заголовок', type: 'text', required: true },
    { name: 'body', label: 'Текст', type: 'textarea' },
    { name: 'label', label: 'Текст кнопки', type: 'text', required: true },
    { name: 'href', label: 'Ссылка', type: 'text', required: true },
  ],
}

export const ProductionSectionBlock: Block = {
  slug: 'productionSection',
  interfaceName: 'ProductionSectionBlock',
  labels: { singular: 'Производство', plural: 'Производство' },
  fields: [
    { name: 'eyebrow', label: 'Надзаголовок', type: 'text' },
    { name: 'heading', label: 'Заголовок', type: 'text', required: true },
    { name: 'body', label: 'Текст', type: 'textarea', required: true },
    {
      name: 'items',
      label: 'Линии',
      labels: { singular: 'Пункт', plural: 'Пункты' },
      type: 'array',
      fields: [{ name: 'label', label: 'Текст', type: 'text', required: true }],
    },
    { name: 'ctaLabel', label: 'Текст кнопки', type: 'text' },
    { name: 'ctaHref', label: 'Ссылка кнопки', type: 'text' },
    { name: 'media', label: 'Изображение', type: 'upload', relationTo: 'media' },
    themeField,
  ],
}

export const ContactsSectionBlock: Block = {
  slug: 'contactsSection',
  interfaceName: 'ContactsSectionBlock',
  labels: { singular: 'Контакты', plural: 'Контакты' },
  fields: [
    { name: 'heading', label: 'Заголовок', type: 'text', required: true },
    { name: 'body', label: 'Текст', type: 'textarea' },
    { name: 'useSiteContacts', label: 'Брать контакты с сайта', type: 'checkbox', defaultValue: true },
    { name: 'phone', label: 'Телефон', type: 'text' },
    { name: 'email', label: 'Почта', type: 'email' },
    { name: 'address', label: 'Адрес', type: 'textarea' },
  ],
}

export const LeadFormBlock: Block = {
  slug: 'leadForm',
  interfaceName: 'LeadFormBlock',
  labels: { singular: 'Форма заявки', plural: 'Формы заявок' },
  fields: [
    { name: 'heading', label: 'Заголовок', type: 'text', required: true },
    { name: 'body', label: 'Текст', type: 'textarea' },
    { name: 'submitLabel', label: 'Текст кнопки', type: 'text' },
    { name: 'successText', label: 'Текст после отправки', type: 'text' },
  ],
}

export const ProjectsCatalogBlock: Block = {
  slug: 'projectsCatalog',
  interfaceName: 'ProjectsCatalogBlock',
  labels: { singular: 'Каталог проектов', plural: 'Каталоги проектов' },
  fields: [
    { name: 'heading', label: 'Заголовок', type: 'text', required: true },
    { name: 'body', label: 'Текст', type: 'textarea' },
  ],
}

export const FaqBlock: Block = {
  slug: 'faq',
  interfaceName: 'FaqBlock',
  labels: { singular: 'Вопрос-ответ', plural: 'Вопросы-ответы' },
  fields: [
    { name: 'heading', label: 'Заголовок', type: 'text', required: true },
    {
      name: 'items',
      label: 'Вопросы',
      labels: { singular: 'Вопрос', plural: 'Вопросы' },
      type: 'array',
      required: true,
      fields: [
        { name: 'question', label: 'Вопрос', type: 'text', required: true },
        { name: 'answer', label: 'Ответ', type: 'textarea', required: true },
      ],
    },
  ],
}

export const pageBlocks = [
  HeroBlock,
  PopularProjectsBlock,
  TextSectionBlock,
  CtaBlock,
  ProductionSectionBlock,
  ContactsSectionBlock,
  LeadFormBlock,
  ProjectsCatalogBlock,
  FaqBlock,
]
