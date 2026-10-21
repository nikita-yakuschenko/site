import { redirectPath, redirectTarget } from '../../../src/lib/redirect-rules'
import { pageRedirectsEndpoint } from './page-redirects-endpoint'
import { APIError, type CollectionConfig } from 'payload'
import { authenticated, contentManager, contentWriter } from '../access/staff'
import { blockContentEndpoint } from './block-content-endpoint'
import { clearPublicMediaCache } from './Media'
import { configurationTemplateFields } from '../config/configuration-template-fields'
import { fixedBlocks } from '../config/fixed-blocks'
import { isStandardRecord } from '../seed/standard-site'

const access = { read: authenticated, create: contentWriter, update: contentWriter, delete: contentManager }

function registry(slug: 'blocks' | 'forms', singular: string, plural: string): CollectionConfig {
  return {
    slug, labels: { singular, plural }, access,
    ...(slug === 'blocks' ? { endpoints: [blockContentEndpoint] } : {}),
    hooks: {
      ...(slug === 'blocks' ? { afterChange: [() => { clearPublicMediaCache() }] } : {}),
      beforeDelete: [async ({ id, req }) => {
        const doc = await req.payload.findByID({ collection: slug, id, depth: 0, overrideAccess: true, req })
        if (isStandardRecord(slug, doc)) throw new Error(slug === 'forms' ? 'Штатная форма входит в структуру сайта и не удаляется.' : 'Штатный блок входит в структуру сайта и не удаляется.')
      }],
    },
    admin: { useAsTitle: 'title', defaultColumns: ['title', 'key', 'updatedAt'], components: { edit: { beforeDocumentControls: ['./components/admin/PageMetadataFields#BlockRecordMetadata'] } } },
    fields: [
      { name: 'title', label: 'Название', type: 'text', required: true },
      ...(slug === 'blocks' ? [configurationTemplateFields] : []),
      { name: 'key', label: 'Ключ компонента', type: 'text', required: true, unique: true, admin: { condition: data => data.key !== 'ProjectConfig' } },
      { name: 'source', label: 'Исходный файл', type: 'text', required: true, admin: { condition: data => data.key !== 'ProjectConfig' } },
      { name: 'exportName', label: 'Экспорт компонента', type: 'text', admin: { condition: data => data.key !== 'ProjectConfig' } },
      { name: 'defaults', label: 'Параметры по умолчанию', type: 'json', admin: { hidden: true, condition: data => data.key !== 'ProjectConfig' } },
      { name: 'preview', type: 'ui', admin: { position: 'sidebar', components: { Field: './components/admin/PagePreviewField#BlockPreviewField' } } },
      { name: 'partFocus', type: 'ui', admin: { components: { Field: './components/admin/PageBlockComposition#BlockPartFocus' } } },
      { name: 'parts', label: 'Состав', type: 'array', labels: { singular: 'часть', plural: 'части' }, admin: { initCollapsed: true, condition: data => data.key !== 'ProjectConfig', components: { RowLabel: './components/admin/PageBlockComposition#BlockPartLabel' } }, fields: [
        { name: 'key', label: 'Ключ элемента', type: 'text', required: true },
        { name: 'title', label: 'Название', type: 'text', required: true },
        { name: 'text', label: 'Текст', type: 'textarea', admin: { components: { Field: './components/admin/PageBlockComposition#PartContentFields' } } },
        { name: 'textMore', type: 'textarea', admin: { components: { Field: './components/admin/PageBlockComposition#HiddenPartField' } } },
        { name: 'href', type: 'text', admin: { components: { Field: './components/admin/PageBlockComposition#HiddenPartField' } } },
        { name: 'action', type: 'select', defaultValue: 'form', options: [{ label: 'Переход по ссылке', value: 'link' }, { label: 'Открытие формы', value: 'form' }], admin: { components: { Field: './components/admin/PageBlockComposition#HiddenPartField' } } },
        { name: 'link', type: 'text', admin: { components: { Field: './components/admin/PageBlockComposition#HiddenPartField' } } },
        { name: 'form', type: 'relationship', relationTo: 'forms', admin: { components: { Field: './components/admin/PageBlockComposition#HiddenPartField' } } },
        { name: 'image', label: 'Десктоп', type: 'upload', relationTo: 'media', admin: { components: { Field: './components/admin/PageBlockComposition#HiddenPartField' } } },
        { name: 'imageMobile', label: 'Телефон', type: 'upload', relationTo: 'media', admin: { components: { Field: './components/admin/PageBlockComposition#HiddenPartField' } } },
      ] },
      ...(slug === 'blocks' ? [{ name: 'forms', label: 'Формы блока', type: 'relationship' as const, relationTo: 'forms' as const, hasMany: true, admin: { allowCreate: false, allowEdit: false, condition: (data: { key?: string }) => data.key !== 'ProjectConfig' } }] : []),
    ],
  }
}

export const Blocks = registry('blocks', 'Блок', 'Блоки')
export const Forms = registry('forms', 'Форма', 'Формы')
export const Pages: CollectionConfig = {
  endpoints: [pageRedirectsEndpoint],
  slug: 'pages', labels: { singular: 'Страница', plural: 'Страницы' }, access,
  versions: { drafts: true, maxPerDoc: 20 },
  hooks: { beforeDelete: [async ({ id, req }) => {
    const doc = await req.payload.findByID({ collection: 'pages', id, depth: 0, overrideAccess: true, req })
    if (isStandardRecord('pages', doc)) throw new Error('Штатная страница входит в структуру сайта и не удаляется.')
  }], beforeChange: [async ({ data, operation, originalDoc, req }) => {
    if ((data.kind ?? originalDoc?.kind) === 'redirect') {
      try {
        data.route = redirectPath(data.route ?? originalDoc?.route ?? '', true)
        data.redirect = redirectPath(data.redirect ?? originalDoc?.redirect ?? '')
        const existing = await req.payload.find({ collection: 'pages', pagination: false, depth: 0, overrideAccess: true, req, where: { kind: { equals: 'redirect' } } })
        const rules = existing.docs.filter(row => row.id !== originalDoc?.id && row.route && row.redirect).map(row => ({ source: row.route!, target: row.redirect! }))
        redirectTarget(data.route, [...rules, { source: data.route, target: data.redirect }])
      } catch (error) { throw new APIError(error instanceof Error ? error.message : 'Некорректное соответствие', 400) }
    }
    // Unnamed drafts get a recognizable name with their record ID
    if (operation === 'create' && !data.title?.trim() && data.id) data.title = `Черновик #${data.id}`
    // Shared and hero blocks stay pinned: leading ones at the top, the rest at the bottom
    type Row = { component?: { relationTo?: string; value?: unknown } }
    const rows: Row[] = Array.isArray(data.layout) ? data.layout : []
    const blockId = (row: Row) => row.component?.relationTo === 'blocks' ? String(typeof row.component.value === 'object' && row.component.value ? (row.component.value as { id: unknown }).id : row.component.value) : null
    const ids = [...new Set(rows.map(blockId).filter((id): id is string => !!id))]
    if (!ids.length) return data
    const blocks = await req.payload.find({ collection: 'blocks', where: { id: { in: ids } }, limit: ids.length, depth: 0, req, overrideAccess: true })
    const shared = new Set(blocks.docs.filter(block => (block.defaults as { shared?: boolean } | null)?.shared === true || fixedBlocks.has(block.key ?? '')).map(block => String(block.id)))
    const isShared = (row: Row) => shared.has(blockId(row) ?? '')
    const original: Row[] = Array.isArray(originalDoc?.layout) ? originalDoc.layout : rows
    const firstContent = original.findIndex(row => !isShared(row))
    const leading = new Set(original.slice(0, firstContent < 0 ? original.length : firstContent).map(blockId))
    const top = rows.filter(row => isShared(row) && leading.has(blockId(row)))
    const bottom = rows.filter(row => isShared(row) && !leading.has(blockId(row)))
    data.layout = [...top, ...rows.filter(row => !isShared(row)), ...bottom]
    return data
  }] },
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'route', 'kind', 'updatedAt'], components: { edit: { beforeDocumentControls: ['./components/admin/PageMetadataFields#PageRecordMetadata'] } } },
  fields: [
    { type: 'row', admin: { className: 'page-details-row' }, fields: [
      { name: 'title', label: 'Название', type: 'text', required: true, admin: { width: '65%' } },
      { name: 'route', label: 'Маршрут', type: 'text', required: true, unique: true, admin: { width: '35%' }, validate: (value: unknown) => typeof value === 'string' && value.startsWith('/') && !/[?#\s]/.test(value) ? true : 'Укажите маршрут, начинающийся с /, без пробелов и параметров запроса' },
    ] },
    { name: 'metaTitle', label: 'Заголовок вкладки (Title)', type: 'text', required: true },
    { type: 'row', admin: { className: 'page-metadata-row' }, fields: [
      { name: 'kind', label: 'Тип', type: 'select', required: true, defaultValue: 'page', admin: { width: '100%', components: { Field: './components/admin/PageMetadataFields#PageKindField' } }, options: [{ label: 'Страница', value: 'page' }, { label: 'Шаблон', value: 'template' }, { label: 'Выставочная площадка', value: 'exposition' }, { label: 'Переадресация', value: 'redirect' }, { label: 'Предпросмотр', value: 'preview' }] },
      { name: 'source', label: 'Исходный файл', type: 'text', admin: { readOnly: true, hidden: true } },
    ] },
    { name: 'redirect', label: 'Адрес переадресации', type: 'text', admin: { condition: data => data.kind === 'redirect' } },
    { name: 'preview', type: 'ui', admin: { position: 'sidebar', components: { Field: './components/admin/PagePreviewField#PagePreviewField' } } },
    { name: 'layout', label: 'Структура страницы', type: 'array', labels: { singular: 'Элемент', plural: 'Элементы' }, admin: { initCollapsed: true, components: { RowLabel: './components/admin/PageLayoutRowLabel#PageLayoutRowLabel' } }, fields: [
      { name: 'component', label: 'Тип блока', type: 'relationship', relationTo: ['blocks', 'forms'], required: true, admin: { allowCreate: false, allowEdit: false, className: 'page-layout-component' } },
      { name: 'composition', type: 'ui', admin: { components: { Field: './components/admin/PageBlockComposition#PageBlockComposition' } } },
      { name: 'anchor', label: 'Якорь', type: 'text', admin: { hidden: true } },
      { name: 'parameters', label: 'Параметры', type: 'json', admin: { hidden: true } },
    ] },
    { name: 'importKey', type: 'text', unique: true, admin: { hidden: true } },
  ],
}
