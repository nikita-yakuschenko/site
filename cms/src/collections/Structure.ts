import type { CollectionConfig } from 'payload'
import { authenticated, contentManager, contentWriter } from '../access/staff'

const access = { read: authenticated, create: contentWriter, update: contentWriter, delete: contentManager }

function registry(slug: 'blocks' | 'forms', singular: string, plural: string): CollectionConfig {
  return {
    slug, labels: { singular, plural }, access,
    admin: { useAsTitle: 'title', defaultColumns: ['title', 'key', 'updatedAt'] },
    fields: [
      { name: 'title', label: 'Название', type: 'text', required: true },
      { name: 'key', label: 'Ключ компонента', type: 'text', required: true, unique: true },
      { name: 'source', label: 'Исходный файл', type: 'text', required: true },
      { name: 'exportName', label: 'Экспорт компонента', type: 'text' },
      { name: 'defaults', label: 'Параметры по умолчанию', type: 'json' },
      { name: 'parts', label: 'Состав компонента', type: 'array', fields: [
        { name: 'key', label: 'Ключ элемента', type: 'text', required: true },
        { name: 'title', label: 'Название', type: 'text', required: true },
      ] },
      ...(slug === 'blocks' ? [{ name: 'forms', label: 'Формы блока', type: 'relationship' as const, relationTo: 'forms' as const, hasMany: true, admin: { allowCreate: false } }] : []),
    ],
  }
}

export const Blocks = registry('blocks', 'Блок', 'Блоки')
export const Forms = registry('forms', 'Форма', 'Формы')
export const Pages: CollectionConfig = {
  slug: 'pages', labels: { singular: 'Страница', plural: 'Страницы' }, access,
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'route', 'kind', 'updatedAt'], components: { edit: { beforeDocumentControls: ['./components/admin/PageMetadataFields#PageRecordMetadata'] } } },
  fields: [
    { type: 'row', admin: { className: 'page-details-row' }, fields: [
      { name: 'title', label: 'Название', type: 'text', required: true, admin: { width: '65%' } },
      { name: 'route', label: 'Маршрут', type: 'text', required: true, unique: true, admin: { width: '35%' }, validate: (value: unknown) => typeof value === 'string' && value.startsWith('/') && !/[?#\s]/.test(value) ? true : 'Укажите маршрут, начинающийся с /, без пробелов и параметров запроса' },
    ] },
    { name: 'metaTitle', label: 'Title', type: 'text', required: true },
    { type: 'row', admin: { className: 'page-metadata-row', condition: data => !data.id }, fields: [
      { name: 'kind', label: 'Тип', type: 'select', required: true, defaultValue: 'page', admin: { width: '100%', components: { Field: './components/admin/PageMetadataFields#PageKindField' } }, options: [{ label: 'Страница', value: 'page' }, { label: 'Шаблон', value: 'template' }, { label: 'Выставочная площадка', value: 'exposition' }, { label: 'Переадресация', value: 'redirect' }, { label: 'Предпросмотр', value: 'preview' }] },
      { name: 'source', label: 'Исходный файл', type: 'text', admin: { readOnly: true, hidden: true } },
    ] },
    { name: 'redirect', label: 'Адрес переадресации', type: 'text', admin: { condition: data => data.kind === 'redirect' } },
    { name: 'preview', type: 'ui', admin: { position: 'sidebar', components: { Field: './components/admin/PagePreviewField#PagePreviewField' } } },
    { name: 'layout', label: 'Структура страницы', type: 'array', labels: { singular: 'Элемент', plural: 'Элементы' }, admin: { initCollapsed: true, components: { RowLabel: './components/admin/PageLayoutRowLabel#PageLayoutRowLabel' } }, fields: [
      { name: 'component', label: 'Блок или форма', type: 'relationship', relationTo: ['blocks', 'forms'], required: true, admin: { allowCreate: false } },
      { name: 'composition', type: 'ui', admin: { components: { Field: './components/admin/PageBlockComposition#PageBlockComposition' } } },
      { name: 'anchor', label: 'Якорь', type: 'text' },
      { name: 'parameters', label: 'Параметры', type: 'json' },
    ] },
    { name: 'importKey', type: 'text', unique: true, admin: { hidden: true } },
  ],
}
