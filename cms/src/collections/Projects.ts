import type { CollectionConfig, Field } from 'payload'
import { authenticated, contentManager, contentWriter } from '../access/staff'
import { projectOrderEndpoints } from './project-order-endpoints'
import { validProjectOrder } from '../config/project-order'

const imageFields: Field[] = [
  { name: 'image', label: 'Изображение', type: 'text', required: true },
  { name: 'thumbnail', type: 'ui', admin: { components: { Field: './components/admin/ProjectImageField#ProjectImage' } } },
]
const rooms: Field = { name: 'rooms', label: 'Помещения', labels: { singular: 'Помещение', plural: 'Помещения' }, type: 'array', admin: { initCollapsed: true }, fields: [
  { type: 'row', fields: [{ name: 'name', label: 'Название', type: 'text', required: true }, { name: 'area', label: 'Площадь, м²', type: 'text', required: true }] },
] }
const gallery = (name: string, label: string): Field => ({ name, label, labels: name === 'floorPlans' ? { singular: 'Чертёж', plural: 'Чертежи' } : { singular: 'Фотография', plural: 'Фотографии' }, type: 'array', admin: { initCollapsed: true }, fields: imageFields })
const integerCount = (minimum: number) => (value: unknown) => typeof value === 'number' && Number.isInteger(value) && value >= minimum ? true : "Укажите целое число не меньше " + minimum
const focus = (previewKey: string, previewTitle: string): Field => ({ name: `${previewKey}Preview`, type: 'ui', custom: { previewKey, previewTitle }, admin: { components: { Field: './components/admin/ProjectSectionPreview#ProjectSectionPreview' } } })

export const Projects: CollectionConfig = {
  slug: 'projects',
  labels: { singular: 'Запись каталога', plural: 'Каталог' },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'recordType', 'technologyBadge', 'areaValue', 'priceAmount'] },
  access: { read: authenticated, create: contentWriter, update: contentWriter, delete: contentManager },
  endpoints: projectOrderEndpoints,
  hooks: { beforeValidate: [({ data, originalDoc }) => {
    if (data?.configurations && (data.recordType ?? originalDoc?.recordType) !== 'ready-home') {
      const standard = data.configurations.find((item: { key: string; price?: number }) => item.key === 'standard')
      if (standard?.price != null) data.priceAmount = standard.price
    }
    if ((data?.recordType ?? originalDoc?.recordType) === 'ready-home') {
      const home = { ...originalDoc?.readyHome, ...data?.readyHome }
      if (!home.location?.trim() || !home.configurationLead?.trim() || !(home.salePrice > 0)) throw new Error('Укажите местоположение, цену продажи и комплектацию готового дома')
    }
    return data
  }] },
  fields: [
    { type: 'row', admin: { className: 'project-details-row' }, fields: [
      { name: 'recordType', label: 'Тип записи', type: 'select', required: true, defaultValue: 'project', options: [{ label: 'Проект дома', value: 'project' }, { label: 'Готовый дом', value: 'ready-home' }] },
      { name: 'slug', label: 'Адрес', type: 'text', required: true, unique: true, validate: (value: unknown) => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) ? true : 'Используйте латинские буквы, цифры и дефисы' },
    ] },
    { name: 'preview', type: 'ui', admin: { position: 'sidebar', components: { Field: './components/admin/PagePreviewField#ProjectPreviewField' } } },
    { name: 'blockOrder', label: 'Порядок блоков', type: 'json', validate: (value: unknown) => value == null || validProjectOrder(value) ? true : 'Порядок должен содержать все блоки без повторений', admin: { components: { Field: './components/admin/ProjectBlockOrder#ProjectBlockOrder' } } },
    { type: 'collapsible', label: 'Главный экран', fields: [
      focus('projectHero', 'Главный экран'),
      { name: 'name', label: 'Название', type: 'text', required: true },
      { name: 'imageUrl', label: 'Фоновое изображение', type: 'text' },
      { name: 'heroThumbnail', type: 'ui', admin: { components: { Field: './components/admin/ProjectImageField#ProjectHeroImage' } } },
      { type: 'row', fields: [
        { name: 'technologyBadge', label: 'Технология', type: 'select', required: true, options: [{ label: 'Панельно-каркасная', value: 'Панельно-каркасный' }, { label: 'Модульная', value: 'Модульный' }] },
        { name: 'series', label: 'Серия', type: 'select', options: [{ label: 'Панельные', value: 'panel' }, { label: 'Барнхаусы', value: 'barn' }, { label: 'Классические', value: 'classic' }, { label: 'Модульные', value: 'modular' }] },
      ] },
      { type: 'row', admin: { className: 'project-specs-row' }, fields: [
        { name: 'areaValue', label: 'Площадь, м²', type: 'number', required: true, min: 0, admin: { width: '25%' } },
        { name: 'floorsValue', label: 'Этажи', type: 'number', required: true, min: 1, validate: integerCount(1), admin: { step: 1, width: '25%' } },
        { name: 'bedrooms', label: 'Спальни', type: 'number', required: true, min: 0, validate: integerCount(0), admin: { step: 1, width: '25%' } },
        { name: 'bathrooms', label: 'Санузлы', type: 'number', required: true, min: 0, validate: integerCount(0), admin: { step: 1, width: '25%' } },
      ] },
    ] },
    { type: 'collapsible', label: 'Фасады', admin: { initCollapsed: true }, fields: [focus('ProjectExteriors', 'Фасады'), gallery('exteriors', 'Фотографии фасадов')] },
    { type: 'collapsible', label: 'Планировки', admin: { initCollapsed: true }, fields: [
      focus('ProjectPlans', 'Планировки'),
      gallery('floorPlans', 'Чертежи'),
      { name: 'plans', label: 'Варианты с экспликацией', labels: { singular: 'Вариант планировки', plural: 'Варианты планировки' }, type: 'array', admin: { initCollapsed: true }, fields: [
        { name: 'label', label: 'Название варианта', type: 'text', required: true },
        { name: 'image', label: 'Чертёж одноэтажного дома', type: 'text' },
        { name: 'thumbnail', type: 'ui', admin: { components: { Field: './components/admin/ProjectImageField#ProjectImage' } } },
        rooms,
        { name: 'floors', label: 'Этажи', labels: { singular: 'Этаж', plural: 'Этажи' }, type: 'array', admin: { initCollapsed: true }, fields: [
          { name: 'label', label: 'Этаж', type: 'text', required: true }, ...imageFields, rooms,
        ] },
      ] },
    ] },
    { type: 'collapsible', label: 'Интерьеры', admin: { initCollapsed: true }, fields: [focus('ProjectInteriors', 'Интерьеры'), gallery('interiors', 'Фотографии интерьеров')] },
    { type: 'collapsible', label: 'Построенные дома', admin: { initCollapsed: true }, fields: [
      focus('ProjectBuilt', 'Построенные дома'),
      { name: 'built', label: 'Фотографии', labels: { singular: 'Фотография', plural: 'Фотографии' }, type: 'array', admin: { initCollapsed: true }, fields: [...imageFields, { name: 'caption', label: 'Подпись', type: 'text' }] },
      { name: 'builtTour', label: 'Видеообзор', type: 'group', fields: [
        { name: 'title', label: 'Название', type: 'text' },
        { name: 'cover', label: 'Обложка', type: 'text' },
        { name: 'video', label: 'Видео', type: 'group', fields: [
          { name: 'provider', label: 'Платформа', type: 'select', options: [{ label: 'Kinescope', value: 'kinescope' }, { label: 'VK Видео', value: 'vk' }] },
          { name: 'id', label: 'ID видео', type: 'text' },
          { name: 'oid', label: 'ID владельца VK', type: 'number', admin: { condition: (_data, siblingData) => siblingData.provider === 'vk' } },
        ] },
      ] },
    ] },
    { type: 'collapsible', label: 'Ипотечный калькулятор', admin: { initCollapsed: true, condition: data => data.recordType !== 'ready-home' }, fields: [
      focus('MortgageCalculator', 'Ипотечный калькулятор'),
      { name: 'mortgageSummary', type: 'ui', admin: { components: { Field: './components/admin/ProjectMortgageSummary#ProjectMortgageSummary' } } },
    ] },
    { type: 'collapsible', label: 'Комплектации', admin: { initCollapsed: true, condition: data => data.recordType !== 'ready-home' }, fields: [
      focus('ProjectConfig', 'Комплектации'),
      { name: 'configurations', label: 'Комплектации', labels: { singular: 'Комплектация', plural: 'Комплектации' }, type: 'array', admin: { initCollapsed: true, components: { RowLabel: './components/admin/ConfigurationRowLabel#ConfigurationRowLabel' } }, fields: [
        { name: 'key', label: 'Тип комплектации', type: 'select', required: true, options: [{ label: 'Стартовая', value: 'start' }, { label: 'Стандартная', value: 'standard' }, { label: 'Проектная', value: 'project' }] },
        { type: 'row', fields: [{ name: 'name', label: 'Название', type: 'text', required: true }, { name: 'price', label: 'Цена, ₽', type: 'number', required: true, min: 0 }] },
        { name: 'lead', label: 'Описание', type: 'textarea' },
        { name: 'mortgage', label: 'Доступна в ипотеку', type: 'checkbox', admin: { components: { Field: './components/admin/CheckboxField#CheckboxField' } } },
        { name: 'includes', label: 'Что входит', labels: { singular: 'Пункт', plural: 'Пункты' }, type: 'array', fields: [{ name: 'text', label: 'Название', type: 'text', required: true }] },
        { name: 'gifts', label: 'Подарки', labels: { singular: 'Подарок', plural: 'Подарки' }, type: 'array', fields: [{ name: 'text', label: 'Название', type: 'text', required: true }] },
        { name: 'details', label: 'Подробный состав', labels: { singular: 'Раздел состава', plural: 'Разделы состава' }, type: 'array', admin: { initCollapsed: true }, fields: [
          { name: 'title', label: 'Заголовок', type: 'text', required: true },
          { name: 'lead', label: 'Описание', type: 'textarea' },
          { name: 'items', label: 'Материалы', labels: { singular: 'Материал', plural: 'Материалы' }, type: 'array', fields: [{ name: 'text', label: 'Описание', type: 'text', required: true }] },
          { name: 'groups', label: 'Узлы', labels: { singular: 'Узел', plural: 'Узлы' }, type: 'array', fields: [
            { name: 'title', label: 'Название', type: 'text', required: true },
            { name: 'items', label: 'Материалы', labels: { singular: 'Материал', plural: 'Материалы' }, type: 'array', fields: [{ name: 'text', label: 'Описание', type: 'text', required: true }] },
          ] },
        ] },
      ] },
      { name: 'priceAmount', label: 'Базовая цена, ₽', type: 'number', min: 0, admin: { hidden: true } },
      { name: 'options', label: 'Дополнительные опции', labels: { singular: 'Опция', plural: 'Опции' }, type: 'array', admin: { initCollapsed: true }, fields: [
        { name: 'key', label: 'Ключ', type: 'text', required: true },
        { name: 'name', label: 'Название', type: 'text', required: true },
        { name: 'price', label: 'Цена, ₽', type: 'number', required: true, min: 0 },
        { name: 'defaultSelected', label: 'Выбрано по умолчанию', type: 'checkbox', admin: { components: { Field: './components/admin/CheckboxField#CheckboxField' } } },
      ] },
    ] },
    { type: 'collapsible', label: 'Готовый дом — условия продажи', admin: { initCollapsed: true, condition: data => data.recordType === 'ready-home' }, fields: [
      focus('ReadyHomeOffer', 'Условия продажи готового дома'),
      { name: 'readyHome', label: false, type: 'group', fields: [
        { type: 'row', fields: [
          { name: 'location', label: 'Местоположение', type: 'text' },
          { name: 'locationPrepositional', label: 'Местоположение после «В»', type: 'text' },
        ] },
        { name: 'salePrice', label: 'Цена продажи, ₽', type: 'number', min: 0 },
        { name: 'configurationLead', label: 'Описание состояния и комплектации', type: 'textarea' },
        { name: 'configuration', label: 'Состав комплектации', labels: { singular: 'Пункт', plural: 'Пункты' }, type: 'array', fields: [{ name: 'text', label: 'Пункт', type: 'text', required: true }] },
        { name: 'sections', label: 'Дом и территория', labels: { singular: 'Раздел', plural: 'Разделы' }, type: 'array', admin: { initCollapsed: true }, fields: [
          { name: 'title', label: 'Название', type: 'text', required: true },
          { name: 'tone', label: 'Категория', type: 'select', required: true, options: [{ label: 'Конструкция', value: 'quality' }, { label: 'Территория', value: 'place' }] },
          { name: 'points', label: 'Пункты', labels: { singular: 'Пункт', plural: 'Пункты' }, type: 'array', fields: [
            { name: 'title', label: 'Название', type: 'text', required: true },
            { name: 'items', label: 'Уточнения', labels: { singular: 'Уточнение', plural: 'Уточнения' }, type: 'array', fields: [{ name: 'text', label: 'Текст', type: 'text', required: true }] },
          ] },
        ] },
        { name: 'visitImage', label: 'Изображение для записи на просмотр', type: 'text' },
      ] },
    ] },
    { type: 'collapsible', label: 'Просмотр дома и консультация', admin: { initCollapsed: true }, fields: [
      focus('ProjectNextSteps', 'Просмотр дома и консультация'),
      { name: 'nextStepsContent', type: 'ui', admin: { components: { Field: './components/admin/ProjectNextStepsContent#ProjectNextStepsContent' } } },
    ] },
    { type: 'collapsible', label: 'Контакты', admin: { initCollapsed: true }, fields: [focus('contactsSection', 'Контакты')] },
    { type: 'collapsible', label: 'Похожие проекты', admin: { initCollapsed: true }, fields: [
      focus('ProjectSimilar', 'Похожие проекты'),
    ] },
    { type: 'collapsible', label: 'Описание для каталога и поиска', admin: { initCollapsed: true }, fields: [
      { name: 'description', label: 'Описание', type: 'textarea' },
      { name: 'about', label: 'Материалы о проекте', labels: { singular: 'Материал', plural: 'Материалы' }, type: 'array', admin: { initCollapsed: true }, fields: [
        { name: 'title', label: 'Заголовок', type: 'text', required: true },
        { name: 'text', label: 'Текст', type: 'textarea', required: true },
        { name: 'image', label: 'Изображение', type: 'text' },
      ] },
    ] },
    { name: 'importKey', type: 'text', unique: true, admin: { hidden: true } },
    { name: 'contentImported', type: 'checkbox', admin: { hidden: true } },
    { name: 'configurationsImported', type: 'checkbox', admin: { hidden: true } },
  ],
}

const sectionKeys: Record<string, string> = { 'Главный экран': 'projectHero', 'Фасады': 'ProjectExteriors', 'Планировки': 'ProjectPlans', 'Интерьеры': 'ProjectInteriors', 'Построенные дома': 'ProjectBuilt', 'Ипотечный калькулятор': 'MortgageCalculator', 'Комплектации': 'ProjectConfig', 'Готовый дом — условия продажи': 'ReadyHomeOffer', 'Просмотр дома и консультация': 'ProjectNextSteps', 'Похожие проекты': 'ProjectSimilar', 'Контакты': 'contactsSection' }
for (const field of Projects.fields) {
  if (field.type === 'collapsible' && typeof field.label === 'string' && sectionKeys[field.label]) {
    field.admin = { ...field.admin, className: `project-order-section-${sectionKeys[field.label]}` }
  }
}
