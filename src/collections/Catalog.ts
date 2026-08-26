import type { CollectionConfig } from 'payload'
import { anyone, pageWrite } from '../access'

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9а-яё\s-]/gi, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export const Catalog: CollectionConfig = {
  slug: 'catalog',
  labels: { singular: 'Проект', plural: 'Каталог' },
  admin: {
    useAsTitle: 'name',
    group: 'Управление контентом',
    defaultColumns: ['name', 'technology', 'area', 'floors', 'bedrooms', 'updatedAt'],
    description:
      'Карточки домов для сайта. Не привязаны к сайту — в блоках страницы выбираешь, какие проекты показать.',
  },
  access: {
    read: anyone,
    create: pageWrite,
    update: pageWrite,
    delete: pageWrite,
  },
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (!data) return data
        if (!data.slug && typeof data.name === 'string' && data.name.trim()) {
          data.slug = slugify(data.name)
        }
        return data
      },
    ],
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Основное',
          fields: [
            { name: 'name', label: 'Название проекта', type: 'text', required: true },
            {
              name: 'slug',
              label: 'Адрес в URL',
              type: 'text',
              required: true,
              unique: true,
              index: true,
              admin: { description: 'Например barnhouse-113. Если пусто — соберём из названия.' },
            },
            { name: 'description', label: 'Описание', type: 'textarea' },
            {
              name: 'cover',
              label: 'Главное фото',
              type: 'upload',
              relationTo: 'media',
            },
            {
              name: 'technology',
              label: 'Технология',
              type: 'select',
              required: true,
              options: [
                { label: 'Модульная', value: 'modular' },
                { label: 'Панельно-каркасная', value: 'panel-frame' },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'area',
                  label: 'Площадь, м²',
                  type: 'number',
                  required: true,
                  min: 1,
                  admin: { width: '25%' },
                },
                {
                  name: 'floors',
                  label: 'Этажей',
                  type: 'number',
                  required: true,
                  min: 1,
                  admin: { width: '25%' },
                },
                {
                  name: 'bedrooms',
                  label: 'Спален',
                  type: 'number',
                  required: true,
                  min: 0,
                  admin: { width: '25%' },
                },
                {
                  name: 'bathrooms',
                  label: 'Санузлов',
                  type: 'number',
                  required: true,
                  min: 0,
                  admin: { width: '25%' },
                },
              ],
            },
            {
              name: 'priceAmount',
              label: 'Цена, ₽',
              type: 'number',
              min: 0,
              admin: { description: 'Пусто — «цена по запросу».' },
            },
            {
              name: 'externalId',
              label: 'ID в учётной системе',
              type: 'text',
              index: true,
              admin: {
                description: 'Необязательно. Нужен, когда появится синхронизация с 1С / ОС.',
              },
            },
          ],
        },
        {
          label: 'Планировки',
          fields: [
            {
              name: 'floorPlans',
              label: 'Планировки',
              labels: { singular: 'Планировка', plural: 'Планировки' },
              type: 'array',
              fields: [
                { name: 'title', label: 'Название', type: 'text', admin: { placeholder: '1 этаж' } },
                {
                  name: 'image',
                  label: 'Файл планировки',
                  type: 'upload',
                  relationTo: 'media',
                  required: true,
                },
                {
                  name: 'rooms',
                  label: 'Экспликация',
                  labels: { singular: 'Помещение', plural: 'Помещения' },
                  type: 'array',
                  admin: { description: 'Список помещений и площадей. Метки на плане — по желанию.' },
                  fields: [
                    { name: 'name', label: 'Помещение', type: 'text', required: true },
                    { name: 'area', label: 'Площадь, м²', type: 'number', min: 0 },
                    {
                      type: 'row',
                      fields: [
                        {
                          name: 'markX',
                          label: 'Метка X, %',
                          type: 'number',
                          min: 0,
                          max: 100,
                          admin: { width: '50%' },
                        },
                        {
                          name: 'markY',
                          label: 'Метка Y, %',
                          type: 'number',
                          min: 0,
                          max: 100,
                          admin: { width: '50%' },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Фасады',
          fields: [
            {
              name: 'exteriors',
              label: 'Варианты фасадов',
              labels: { singular: 'Фото', plural: 'Фото' },
              type: 'array',
              fields: [
                {
                  name: 'image',
                  label: 'Изображение',
                  type: 'upload',
                  relationTo: 'media',
                  required: true,
                },
                { name: 'caption', label: 'Подпись', type: 'text' },
              ],
            },
          ],
        },
        {
          label: 'Интерьеры',
          fields: [
            {
              name: 'interiors',
              label: 'Варианты интерьеров',
              labels: { singular: 'Фото', plural: 'Фото' },
              type: 'array',
              fields: [
                {
                  name: 'image',
                  label: 'Изображение',
                  type: 'upload',
                  relationTo: 'media',
                  required: true,
                },
                { name: 'caption', label: 'Подпись', type: 'text' },
              ],
            },
          ],
        },
        {
          label: 'Опции',
          fields: [
            {
              name: 'options',
              label: 'Дополнительные опции',
              labels: { singular: 'Опция', plural: 'Опции' },
              type: 'array',
              fields: [
                { name: 'name', label: 'Название', type: 'text', required: true },
                { name: 'price', label: 'Цена, ₽', type: 'number', min: 0, defaultValue: 0 },
                {
                  name: 'defaultSelected',
                  label: 'Выбрана по умолчанию',
                  type: 'checkbox',
                  defaultValue: false,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}
