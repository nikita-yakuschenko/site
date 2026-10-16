import type { CollectionConfig, Field } from 'payload'
import { authenticated, contentManager, contentWriter, privilegedField } from '../access/staff'
import { projectOrderEndpoints } from './project-order-endpoints'
import { validProjectOrder, completeProjectOrder, normalizeProjectOrder } from '../config/project-order'
import type { ProjectContentBlock } from '../config/project-content-sources'
import { projectHeroEndpoint } from './project-hero-endpoint'
import { projectExteriorsEndpoint } from './project-exteriors-endpoint'
import { projectInteriorsEndpoint } from './project-interiors-endpoint'
import { projectBuiltEndpoint } from './project-built-endpoint'
import { detectBuiltVideo } from '../config/built-media'
import { projectPlansEndpoint } from './project-plans-endpoint'
import { normalizePlans, validRoomArea } from '../config/project-plans'
import { projectNextStepsEndpoint } from './project-next-steps-endpoint'
import { projectConfigurationsEndpoint } from './project-configurations-endpoint'
import { projectCatalogEndpoint } from './project-catalog-endpoint'
import { projectReactionsEndpoint, projectReactionsWriteEndpoint } from './project-reactions-endpoint'
import { normalizeConfigurations } from '../config/project-configurations'
import { configurationKeys, isModularTechnology } from '../../../src/lib/catalog/configuration-rules'
import { claimProductCode } from './record-id'

const imageFields: Field[] = [
  { name: 'image', label: 'Изображение', type: 'text', required: true },
  { name: 'thumbnail', type: 'ui', admin: { components: { Field: './components/admin/ProjectImageField#ProjectImage' } } },
]
const rooms: Field = { name: 'rooms', label: 'Экспликация', required: true, minRows: 1, labels: { singular: 'Помещение', plural: 'Помещения' }, type: 'array', admin: { initCollapsed: true, components: { Field: './components/admin/RoomsTable#RoomsTable' } }, fields: [
  { type: 'row', fields: [{ name: 'name', label: 'Название', type: 'text', required: true }, { name: 'area', label: 'Площадь, м²', type: 'text', required: true, validate: (value: unknown) => validRoomArea(value) ? true : 'Укажите площадь больше нуля' }] },
] }
const integerCount = (minimum: number) => (value: unknown) => typeof value === 'number' && Number.isInteger(value) && value >= minimum ? true : "Укажите целое число не меньше " + minimum
const focus = (previewKey: string, previewTitle: string): Field => ({ name: `${previewKey}Preview`, type: 'ui', custom: { previewKey, previewTitle }, admin: { components: { Field: './components/admin/ProjectSectionPreview#ProjectSectionPreview' } } })
const galleryBatch = (target: 'exteriors' | 'interiors' | 'built') => ({ path: './components/admin/ProjectImageUpload#GalleryBatchUpload', clientProps: { target } })

export const Projects: CollectionConfig = {
  slug: 'projects',
  labels: { singular: 'Запись каталога', plural: 'Каталог' },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'recordType', 'technologyBadge', 'areaValue', 'priceAmount', '_status'], components: { edit: { beforeDocumentControls: ['./components/admin/PageMetadataFields#ProjectRecordMetadata'] } } },
  versions: { drafts: true, maxPerDoc: 20 },
  access: { read: authenticated, create: contentWriter, update: contentWriter, delete: contentManager },
  endpoints: [...projectOrderEndpoints, projectHeroEndpoint, projectExteriorsEndpoint, projectInteriorsEndpoint, projectBuiltEndpoint, projectNextStepsEndpoint, projectPlansEndpoint, projectConfigurationsEndpoint, projectCatalogEndpoint, projectReactionsEndpoint, projectReactionsWriteEndpoint],
  hooks: { beforeDelete: [async ({ id, req }) => {
    // Price rows require a project, so they go first
    await req.payload.delete({ collection: 'project-prices', where: { project: { equals: id } }, req, overrideAccess: true })
  }], beforeValidate: [async ({ data, operation, req }) => {
    // The code is the public product identifier. The numeric primary key stays internal.
    if (operation === 'create' && data) data.code = await claimProductCode(req)
    if (operation === 'update' && data) delete data.code
    return data
  }, ({ data, originalDoc }) => {
    if (Array.isArray(data?.plans)) data.plans = normalizePlans(data.plans)
    if (data && completeProjectOrder(data.blockOrder)) data.blockOrder = normalizeProjectOrder(data.blockOrder)
    if (Array.isArray(data?.interiors)) data.interiors = data.interiors.map((row: { photo?: unknown; image?: string }) => ({ ...row, image: row.photo ? null : row.image }))
    if (Array.isArray(data?.built)) {
      const primary = Math.max(0, data.built.findIndex((row: { isPrimary?: boolean }) => row.isPrimary))
      data.built = data.built.map((row: { photo?: unknown; image?: string; type?: string; videoUrl?: string }, index: number) => {
        const video = row.type === 'video' ? detectBuiltVideo(row.videoUrl) : null
        return { ...row, image: row.photo ? null : row.image, isPrimary: index === primary, ...(row.type === 'video' ? { provider: video?.provider ?? null } : { provider: null, videoUrl: null }) }
      })
    }
    if (Array.isArray(data?.exteriors) && data.exteriors.length) {
      const primary = Math.max(0, data.exteriors.findIndex((row: { isPrimary?: boolean }) => row.isPrimary))
      data.exteriors = data.exteriors.map((row: { photo?: unknown; image?: string }, index: number) => ({ ...row, image: row.photo ? null : row.image, isPrimary: index === primary }))
    }
    if (data && (data.recordType ?? originalDoc?.recordType) !== 'ready-home' && (data.configurations || data.technologyBadge)) {
      const badge = data.technologyBadge ?? originalDoc?.technologyBadge ?? 'Панельно-каркасный'
      const rows = data.configurations ?? originalDoc?.configurations ?? []
      const keys = configurationKeys(isModularTechnology(badge))
      const archived = rows.filter((row: { key: string }) => !keys.includes(row.key as typeof keys[number]))
      if (archived.length) data.legacyConfigurations = [...(Array.isArray(originalDoc?.legacyConfigurations) ? originalDoc.legacyConfigurations : []), ...archived]
      data.configurations = normalizeConfigurations(rows, badge)
      const standard = data.configurations.find((item: { key: string; price?: number }) => item.key === 'standard')
      if (standard?.price != null) data.priceAmount = standard.price
    }
    if ((data?.recordType ?? originalDoc?.recordType) === 'ready-home') {
      const home = { ...originalDoc?.readyHome, ...data?.readyHome }
      if (!home.location?.trim() || !home.configurationLead?.trim() || !(home.salePrice > 0)) throw new Error('Укажите местоположение, цену продажи и комплектацию готового дома')
    }
    return data
  }], beforeChange: [({ data, operation, originalDoc }) => {
    // Unnamed drafts get a recognizable name with their record ID
    if (operation === 'create' && !data.name?.trim() && data.code) data.name = `Черновик ${data.code}`
    const manualProject = (operation === 'create' && !data.importKey) || (originalDoc && !originalDoc.importKey)
    if (manualProject || data.desktopImage) data.heroContentSource = 'database'
    if (manualProject) {
      data.exteriorsContentSource = 'database'; data.interiorsContentSource = 'database'; data.builtContentSource = 'database'; data.plansContentSource = 'database'
    }
    for (const field of ['exteriors', 'interiors', 'built'] as const) if (Array.isArray(data[field]) && data[field].some((row: { photo?: unknown }) => row.photo)) data[`${field}ContentSource`] = 'database'
    if (Array.isArray(data.plans) && data.plans.length > 0) data.plansContentSource = 'database'
    return data
  }, ({ data, originalDoc }) => {
    // Счётчики меняет только SQL-приращение. Сохранение карточки не должно
    // затирать лайки и репосты числом из открытой формы.
    if (data && originalDoc) {
      data.likeCount = originalDoc.likeCount ?? 0
      data.shareCount = originalDoc.shareCount ?? 0
      data.likeVoters = originalDoc.likeVoters ?? []
      data.shareVoters = originalDoc.shareVoters ?? []
    }
    return data
  }] },
  fields: [
    { type: 'row', admin: { className: 'project-details-row' }, fields: [
      { name: 'recordType', label: 'Тип записи', type: 'select', required: true, defaultValue: 'project', options: [{ label: 'Проект дома', value: 'project' }, { label: 'Готовый дом', value: 'ready-home' }] },
      { name: 'slug', label: 'Адрес', type: 'text', required: true, unique: true, validate: (value: unknown) => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) ? true : 'Используйте латинские буквы, цифры и дефисы' },
    ] },
    { name: 'code', label: 'Код', type: 'text', unique: true, index: true, admin: { hidden: true } },
    { name: 'preview', type: 'ui', admin: { position: 'sidebar', components: { Field: './components/admin/PagePreviewField#ProjectPreviewField' } } },
    { name: 'blockOrder', label: 'Порядок блоков', type: 'json', validate: (value: unknown) => value == null || validProjectOrder(value) ? true : 'Порядок должен содержать все блоки без повторений', admin: { components: { Field: './components/admin/ProjectBlockOrder#ProjectBlockOrder' } } },
    { type: 'collapsible', label: 'Главный экран', fields: [
      focus('projectHero', 'Главный экран'),
      { name: 'name', label: 'Название', type: 'text', required: true, admin: { className: 'project-name-field' } },
      { name: 'desktopImage', label: 'Изображение главного экрана: десктоп', type: 'upload', relationTo: 'media', admin: { components: { Field: './components/admin/ProjectImageUpload#ProjectImageUpload' } } },
      { name: 'imageUrl', type: 'text', admin: { hidden: true } },
      { name: 'heroThumbnail', type: 'ui', admin: { components: { Field: './components/admin/ProjectImageField#ProjectHeroImage' } } },
      { name: 'mobileImage', label: 'Изображение главного экрана: мобильное', type: 'upload', relationTo: 'media', admin: { description: 'До 430 px. Если не задано, используется десктопное изображение.', components: { Field: './components/admin/ProjectImageUpload#ProjectImageUpload' } } },
      { name: 'mobileImageUrl', type: 'text', admin: { hidden: true } },
      { name: 'mobileHeroThumbnail', type: 'ui', admin: { components: { Field: './components/admin/ProjectImageField#ProjectMobileHeroImage' } } },
      { type: 'row', admin: { className: 'project-choice-row' }, fields: [
        { name: 'technologyBadge', label: 'Технология', type: 'select', required: true, options: [{ label: 'Панельно-каркасная', value: 'Панельно-каркасный' }, { label: 'Модульная', value: 'Модульный' }] },
        { name: 'series', label: 'Серия', type: 'select', options: [{ label: 'Панельные', value: 'panel' }, { label: 'Барнхаусы', value: 'barn' }, { label: 'Классические', value: 'classic' }, { label: 'Модульные', value: 'modular' }, { label: 'А-фрейм', value: 'aframe' }] },
      ] },
      { type: 'row', admin: { className: 'project-specs-row' }, fields: [
        { name: 'areaValue', label: 'Площадь', type: 'number', required: true, min: 0, admin: { width: '25%' } },
        { name: 'floorsValue', label: 'Этажи', type: 'number', required: true, min: 1, validate: integerCount(1), admin: { step: 1, width: '25%' } },
        { name: 'bedrooms', label: 'Спальни', type: 'number', required: true, min: 0, validate: integerCount(0), admin: { step: 1, width: '25%' } },
        { name: 'bathrooms', label: 'Санузлы', type: 'number', required: true, min: 0, validate: integerCount(0), admin: { step: 1, width: '25%' } },
      ] },
    ] },
    { type: 'collapsible', label: 'Рендеры фасадов', admin: { initCollapsed: true }, fields: [focus('ProjectExteriors', 'Рендеры фасадов'), {
      name: 'exteriors', label: 'Рендеры фасадов', labels: { singular: 'Рендер', plural: 'Рендеры' }, type: 'array',
      admin: { className: 'gallery-attachments', initCollapsed: true, components: { beforeInput: [galleryBatch('exteriors')], RowLabel: './components/admin/ExteriorRowLabel#ExteriorRowLabel' } },
      fields: [
        { name: 'photo', label: 'Изображение', type: 'upload', relationTo: 'media', validate: (value: unknown, { siblingData }: { siblingData?: { image?: string } }) => value || siblingData?.image ? true : 'Загрузите или выберите изображение', admin: { components: { Field: './components/admin/ProjectImageUpload#ProjectImageUpload' } } },
        { name: 'image', type: 'text', admin: { hidden: true } },
        { name: 'isPrimary', type: 'checkbox', defaultValue: false, admin: { hidden: true } },
        { name: 'thumbnail', type: 'ui', admin: { components: { Field: './components/admin/ProjectImageField#ProjectExteriorImage' } } },
      ],
    }] },
    { type: 'collapsible', label: 'Планировки', admin: { initCollapsed: true }, fields: [
      focus('ProjectPlans', 'Планировки'),
      { name: 'floorPlans', type: 'array', admin: { hidden: true }, fields: imageFields },
      { name: 'plans', label: 'Варианты планировки', labels: { singular: 'вариант', plural: 'Варианты' }, type: 'array', admin: { initCollapsed: true, components: { RowLabel: './components/admin/PlanRowLabels#PlanVariantRowLabel' } }, fields: [
        { name: 'label', type: 'text', admin: { hidden: true } },
        { name: 'image', type: 'text', admin: { hidden: true } },
        { ...rooms, required: false, minRows: undefined, admin: { hidden: true } },
        { name: 'floors', label: 'Этажи', labels: { singular: 'этаж', plural: 'Этажи' }, type: 'array', required: true, minRows: 1, defaultValue: [{ label: null, rooms: [] }],
          admin: { initCollapsed: false, components: { RowLabel: './components/admin/PlanRowLabels#PlanFloorRowLabel' } }, fields: [
            { name: 'label', type: 'text', admin: { hidden: true } },
            { name: 'photo', label: 'Планировка этажа', type: 'upload', relationTo: 'media', validate: (value: unknown, { siblingData }: { siblingData?: { image?: string } }) => value || siblingData?.image ? true : 'Загрузите планировку этажа', admin: { components: { Field: { path: './components/admin/ProjectImageUpload#ProjectImageUpload', clientProps: { imageKind: 'plan' } } } } },
            { name: 'image', type: 'text', admin: { hidden: true } },
            { name: 'thumbnail', type: 'ui', admin: { components: { Field: './components/admin/ProjectImageField#ProjectExteriorImage' } } },
            rooms,
          ],
        },
      ] },
    ] },
    { type: 'collapsible', label: 'Рендеры интерьеров', admin: { initCollapsed: true }, fields: [focus('ProjectInteriors', 'Рендеры интерьеров'), {
      name: 'interiors', label: 'Рендеры интерьеров', labels: { singular: 'Рендер', plural: 'Рендеры' }, type: 'array', admin: { className: 'gallery-attachments', initCollapsed: true, components: { beforeInput: [galleryBatch('interiors')] } },
      fields: [
        { name: 'photo', label: 'Изображение', type: 'upload', relationTo: 'media', validate: (value: unknown, { siblingData }: { siblingData?: { image?: string } }) => value || siblingData?.image ? true : 'Загрузите или выберите изображение', admin: { components: { Field: './components/admin/ProjectImageUpload#ProjectImageUpload' } } },
        { name: 'image', type: 'text', admin: { hidden: true } },
        { name: 'thumbnail', type: 'ui', admin: { components: { Field: './components/admin/ProjectImageField#ProjectExteriorImage' } } },
      ],
    }] },
    { type: 'collapsible', label: 'Построенные дома', admin: { initCollapsed: true }, fields: [
      focus('ProjectBuilt', 'Построенные дома'),
      { name: 'built', label: 'Фото и видео', labels: { singular: 'запись', plural: 'Записи' }, type: 'array', admin: { className: 'gallery-attachments', initCollapsed: true, components: { beforeInput: [galleryBatch('built')], RowLabel: './components/admin/BuiltRowLabel#BuiltRowLabel' } }, fields: [
        { name: 'type', label: 'Тип записи', type: 'select', required: true, defaultValue: 'photo', options: [{ label: 'Фото', value: 'photo' }, { label: 'Видео', value: 'video' }], admin: { hidden: true } },
        { name: 'isPrimary', type: 'checkbox', defaultValue: false, admin: { hidden: true } },
        { name: 'provider', label: 'Платформа', type: 'select', options: [{ label: 'Kinescope', value: 'kinescope' }, { label: 'VK Видео', value: 'vk' }], admin: { hidden: true } },
        { name: 'videoUrl', label: 'Ссылка на видео', type: 'text', validate: (value: unknown, { siblingData }: { siblingData?: { type?: string } }) => siblingData?.type !== 'video' || detectBuiltVideo(value) ? true : 'Вставьте ссылку на ролик Kinescope или VK Видео', admin: { condition: (_data, siblingData) => siblingData.type === 'video', description: 'Платформа определяется по ссылке автоматически.' } },
        { name: 'photo', label: 'Изображение', type: 'upload', relationTo: 'media', validate: (value: unknown, { siblingData }: { siblingData?: { type?: string; image?: string } }) => siblingData?.type === 'video' || value || siblingData?.image ? true : 'Загрузите или выберите фотографию', admin: { components: { Field: './components/admin/ProjectImageUpload#ProjectImageUpload' } } },
        { name: 'image', type: 'text', admin: { hidden: true } },
        { name: 'thumbnail', type: 'ui', admin: { components: { Field: './components/admin/ProjectImageField#ProjectExteriorImage' } } },
        { name: 'caption', label: 'Подпись', type: 'text' },
      ] },
      { name: 'builtTour', label: 'Видеообзор', type: 'group', admin: { hidden: true }, fields: [
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
      { name: 'configurationSummary', type: 'ui', admin: { components: { Field: './components/admin/ProjectConfigurationSummary#ProjectConfigurationSummary' } } },
      { name: 'configurations', label: 'Комплектации', labels: { singular: 'Комплектация', plural: 'Комплектации' }, type: 'array', maxRows: 3, defaultValue: normalizeConfigurations([], 'Панельно-каркасный'), admin: { hidden: true, initCollapsed: true, components: { RowLabel: './components/admin/ConfigurationRowLabel#ConfigurationRowLabel' } }, fields: [
        { name: 'key', label: 'Тип комплектации', type: 'select', required: true, admin: { readOnly: true }, options: [{ label: 'Стартовая', value: 'start' }, { label: 'Стандартная', value: 'standard' }, { label: 'Проектная', value: 'project' }, { label: 'Под ключ', value: 'turnkey' }] },
        { name: 'name', label: 'Название', type: 'text', required: true, admin: { hidden: true } },
        { name: 'price', label: 'Цена для Нижнего Новгорода, ₽', type: 'number', required: true, min: 0, admin: { description: '0 — цена не задана. Региональные цены загружаются в разделе «Прайс» и имеют приоритет.' } },
        { name: 'lead', label: 'Описание', type: 'textarea' },
        { name: 'mortgage', label: 'Доступна в ипотеку', type: 'checkbox', admin: { readOnly: true, components: { Field: './components/admin/CheckboxField#CheckboxField' } } },
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
    { type: 'collapsible', label: 'Цены', admin: { className: 'project-prices-section', initCollapsed: true, condition: data => data.recordType !== 'ready-home' }, fields: [
      { name: 'pricesEditor', type: 'ui', admin: { components: { Field: './components/admin/ProjectPricesEditor#ProjectPricesEditor' } } },
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
      { name: 'nextStepsSettings', label: false, type: 'group', fields: [
        { name: 'enabled', type: 'checkbox', defaultValue: true, admin: { hidden: true } },
        { name: 'visitEnabled', type: 'checkbox', defaultValue: true, admin: { hidden: true } },
        { name: 'secondaryEnabled', type: 'checkbox', defaultValue: true, admin: { hidden: true } },
        { name: 'order', type: 'select', defaultValue: 'visit-first', options: ['visit-first', 'secondary-first'], admin: { hidden: true } },
        { name: 'nextStepsContent', type: 'ui', admin: { components: { Field: './components/admin/ProjectNextStepsContent#ProjectNextStepsContent' } } },
      ] },
    ] },
    { type: 'collapsible', label: 'Контакты', admin: { initCollapsed: true }, fields: [] },
    { type: 'collapsible', label: 'Похожие проекты', admin: { initCollapsed: true }, fields: [] },
    { type: 'collapsible', label: 'Описание для каталога и поиска', admin: { initCollapsed: true }, fields: [
      { name: 'description', label: 'Описание', type: 'textarea', admin: { hidden: true } },
      { name: 'searchDescription', label: 'Описание для поиска', type: 'textarea', admin: { components: { Field: './components/admin/ProjectSearchDescription#ProjectSearchDescription' } } },
      { name: 'about', label: 'Материалы о проекте', labels: { singular: 'Материал', plural: 'Материалы' }, type: 'array', admin: { initCollapsed: true }, fields: [
        { name: 'title', label: 'Заголовок', type: 'text', required: true },
        { name: 'text', label: 'Текст', type: 'textarea', required: true },
        { name: 'image', label: 'Изображение', type: 'text' },
      ] },
    ] },
    { name: 'importKey', type: 'text', unique: true, admin: { hidden: true } },
    { name: 'heroContentSource', type: 'select', defaultValue: 'mock', options: [{ label: 'Мок', value: 'mock' }, { label: 'БД', value: 'database' }], admin: { hidden: true }, access: { create: privilegedField, update: privilegedField } },
    { name: 'exteriorsContentSource', type: 'select', defaultValue: 'mock', options: [{ label: 'Мок', value: 'mock' }, { label: 'БД', value: 'database' }], admin: { hidden: true }, access: { create: privilegedField, update: privilegedField } },
    { name: 'interiorsContentSource', type: 'select', defaultValue: 'mock', options: [{ label: 'Мок', value: 'mock' }, { label: 'БД', value: 'database' }], admin: { hidden: true }, access: { create: privilegedField, update: privilegedField } },
    { name: 'plansContentSource', type: 'select', defaultValue: 'database', options: ['mock', 'database'], admin: { hidden: true }, access: { create: privilegedField, update: privilegedField } },
    { name: 'builtContentSource', type: 'select', defaultValue: 'mock', options: [{ label: 'Мок', value: 'mock' }, { label: 'БД', value: 'database' }], admin: { hidden: true }, access: { create: privilegedField, update: privilegedField } },
    { name: 'contentImported', type: 'checkbox', admin: { hidden: true } },
    { name: 'configurationsImported', type: 'checkbox', admin: { hidden: true } },
    { name: 'legacyConfigurations', type: 'json', admin: { hidden: true } },
    { name: 'likeCount', type: 'number', admin: { hidden: true } },
    { name: 'shareCount', type: 'number', admin: { hidden: true } },
    // Ключи голосов: c: кука, f: отпечаток, позже a: аккаунт. Не список людей.
    { name: 'likeVoters', type: 'json', defaultValue: [], admin: { hidden: true } },
    { name: 'shareVoters', type: 'json', defaultValue: [], admin: { hidden: true } },
  ],
}

const sectionKeys: Record<string, ProjectContentBlock> = { 'Главный экран': 'projectHero', 'Рендеры фасадов': 'ProjectExteriors', 'Планировки': 'ProjectPlans', 'Рендеры интерьеров': 'ProjectInteriors', 'Построенные дома': 'ProjectBuilt', 'Ипотечный калькулятор': 'MortgageCalculator', 'Комплектации': 'ProjectConfig', 'Готовый дом — условия продажи': 'ReadyHomeOffer', 'Просмотр дома и консультация': 'ProjectNextSteps', 'Похожие проекты': 'ProjectSimilar', 'Контакты': 'contactsSection' }
// Top-level data names inside unnamed layout fields
const namesOf = (fields: Field[]): string[] => fields.flatMap(field => 'name' in field ? [field.name] : 'fields' in field ? namesOf(field.fields) : [])
for (const field of Projects.fields) {
  if (field.type !== 'collapsible' || typeof field.label !== 'string') continue
  const blockKey = sectionKeys[field.label]
  field.admin = {
    ...field.admin,
    ...(blockKey ? { className: `project-order-section-${blockKey}` } : {}),
    components: {
      ...field.admin?.components,
      Field: './components/admin/ProjectSectionCard#ProjectSectionCard',
      ...(blockKey ? { Label: { path: './components/admin/ProjectSectionLabel#ProjectSectionLabel', clientProps: { title: field.label, blockKey, fieldNames: namesOf(field.fields) } } } : {}),
    },
  }
}
