import type { Block } from 'payload'

const themeField = {
  name: 'theme',
  type: 'select' as const,
  required: true,
  defaultValue: 'dark',
  options: [
    { label: 'Light', value: 'light' },
    { label: 'Dark', value: 'dark' },
    { label: 'Brand', value: 'brand' },
  ],
}

const sizeField = {
  name: 'size',
  type: 'select' as const,
  required: true,
  defaultValue: 'standard',
  options: [
    { label: 'Compact', value: 'compact' },
    { label: 'Standard', value: 'standard' },
    { label: 'Accent', value: 'large' },
  ],
}

export const HeroBlock: Block = {
  slug: 'hero',
  interfaceName: 'HeroBlock',
  labels: { singular: 'Hero', plural: 'Hero' },
  fields: [
    { name: 'heading', type: 'text', required: true },
    { name: 'description', type: 'textarea' },
    { name: 'media', type: 'upload', relationTo: 'media' },
    themeField,
    { ...sizeField, defaultValue: 'large' },
    {
      name: 'primaryAction',
      type: 'group',
      fields: [
        { name: 'label', type: 'text' },
        { name: 'href', type: 'text' },
      ],
    },
    {
      name: 'secondaryAction',
      type: 'group',
      fields: [
        { name: 'label', type: 'text' },
        { name: 'href', type: 'text' },
      ],
    },
  ],
}

export const PopularProjectsBlock: Block = {
  slug: 'popularProjects',
  interfaceName: 'PopularProjectsBlock',
  labels: { singular: 'Popular projects', plural: 'Popular projects' },
  fields: [
    { name: 'eyebrow', type: 'text' },
    { name: 'heading', type: 'text', required: true },
    { name: 'catalogHref', type: 'text', defaultValue: '/projects' },
    { name: 'catalogLabel', type: 'text' },
    {
      name: 'projectIds',
      type: 'array',
      admin: { description: 'Operational project ids. Empty = fixture default set.' },
      fields: [{ name: 'id', type: 'text', required: true }],
    },
  ],
}

export const TextSectionBlock: Block = {
  slug: 'textSection',
  interfaceName: 'TextSectionBlock',
  labels: { singular: 'Text section', plural: 'Text sections' },
  fields: [
    { name: 'heading', type: 'text' },
    { name: 'body', type: 'textarea', required: true },
  ],
}

export const CtaBlock: Block = {
  slug: 'cta',
  interfaceName: 'CtaBlock',
  labels: { singular: 'CTA', plural: 'CTA' },
  fields: [
    { name: 'heading', type: 'text', required: true },
    { name: 'body', type: 'textarea' },
    { name: 'label', type: 'text', required: true },
    { name: 'href', type: 'text', required: true },
  ],
}

export const ProductionSectionBlock: Block = {
  slug: 'productionSection',
  interfaceName: 'ProductionSectionBlock',
  labels: { singular: 'Production', plural: 'Production' },
  fields: [
    { name: 'eyebrow', type: 'text' },
    { name: 'heading', type: 'text', required: true },
    { name: 'body', type: 'textarea', required: true },
    {
      name: 'items',
      type: 'array',
      fields: [{ name: 'label', type: 'text', required: true }],
    },
    { name: 'ctaLabel', type: 'text' },
    { name: 'ctaHref', type: 'text' },
    { name: 'media', type: 'upload', relationTo: 'media' },
    themeField,
  ],
}

export const ContactsSectionBlock: Block = {
  slug: 'contactsSection',
  interfaceName: 'ContactsSectionBlock',
  labels: { singular: 'Contacts', plural: 'Contacts' },
  fields: [
    { name: 'heading', type: 'text', required: true },
    { name: 'body', type: 'textarea' },
    { name: 'useSiteContacts', type: 'checkbox', defaultValue: true },
    { name: 'phone', type: 'text' },
    { name: 'email', type: 'email' },
    { name: 'address', type: 'textarea' },
  ],
}

export const LeadFormBlock: Block = {
  slug: 'leadForm',
  interfaceName: 'LeadFormBlock',
  labels: { singular: 'Lead form', plural: 'Lead forms' },
  fields: [
    { name: 'heading', type: 'text', required: true },
    { name: 'body', type: 'textarea' },
    { name: 'submitLabel', type: 'text' },
    { name: 'successText', type: 'text' },
  ],
}

export const ProjectsCatalogBlock: Block = {
  slug: 'projectsCatalog',
  interfaceName: 'ProjectsCatalogBlock',
  labels: { singular: 'Projects catalog', plural: 'Projects catalogs' },
  fields: [
    { name: 'heading', type: 'text', required: true },
    { name: 'body', type: 'textarea' },
  ],
}

export const FaqBlock: Block = {
  slug: 'faq',
  interfaceName: 'FaqBlock',
  labels: { singular: 'FAQ', plural: 'FAQ' },
  fields: [
    { name: 'heading', type: 'text', required: true },
    {
      name: 'items',
      type: 'array',
      required: true,
      fields: [
        { name: 'question', type: 'text', required: true },
        { name: 'answer', type: 'textarea', required: true },
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
