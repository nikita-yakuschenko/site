import type { CollectionConfig } from 'payload'
import { authenticated, contentManager, contentWriter } from '../access/staff'
import { detectBuiltVideo } from '../config/built-media'
import { projectSlugFromName } from '../config/project-slug'
import { fetchVideoMetaFromUrl } from '../config/video-meta'
import { storiesFeedEndpoint } from './stories-feed-endpoint'
import { storiesVideoMetaEndpoint } from './stories-video-meta-endpoint'

const galleryBatch = { path: './components/admin/ProjectImageUpload#GalleryBatchUpload', clientProps: { target: 'media' } }

type StoryMediaRow = {
  type?: string
  videoUrl?: string | null
  videoFile?: unknown
  photo?: unknown
  image?: string | null
  isPrimary?: boolean
  duration?: string | null
  posterUrl?: string | null
  provider?: string | null
}

export const Stories: CollectionConfig = {
  slug: 'stories',
  labels: { singular: 'Отзыв', plural: 'Отзывы' },
  admin: {
    useAsTitle: 'heading',
    defaultColumns: ['heading', 'customerKind', 'year', 'place', 'binding', '_status'],
    components: { edit: { beforeDocumentControls: ['./components/admin/PageMetadataFields#StoryRecordMetadata'] } },
  },
  versions: { drafts: true, maxPerDoc: 20 },
  access: { read: authenticated, create: contentWriter, update: contentWriter, delete: contentManager },
  endpoints: [storiesFeedEndpoint, storiesVideoMetaEndpoint],
  hooks: {
    beforeValidate: [({ data }) => {
      if (!data) return data
      if (typeof data.heading === 'string' && (!data.slug || typeof data.slug !== 'string')) data.slug = projectSlugFromName(data.heading)
      if (data.binding !== 'catalog') data.project = null
      else data.relatedCard = { enabled: true, title: null, text: null, image: null }
      if (Array.isArray(data.media)) {
        const primary = Math.max(0, data.media.findIndex((row: StoryMediaRow) => row.isPrimary))
        data.media = data.media.map((row: StoryMediaRow, index: number) => {
          const video = row.type === 'video' ? detectBuiltVideo(row.videoUrl) : null
          return {
            ...row,
            image: row.photo ? null : row.image,
            isPrimary: index === primary,
            ...(row.type === 'video'
              ? { provider: row.videoFile ? null : video?.provider ?? null, videoUrl: row.videoFile ? null : row.videoUrl || null }
              : { provider: null, videoUrl: null, videoFile: null, duration: null, posterUrl: null }),
          }
        })
      }
      if (data.binding === 'catalog' && !data.project) throw new Error('Выберите проект из каталога или отметьте индивидуальный проект либо снятие с производства')
      return data
    }],
    beforeChange: [async ({ data }) => {
      if (!data || !Array.isArray(data.media)) return data
      data.media = await Promise.all(data.media.map(async (row: StoryMediaRow) => {
        if (row.type !== 'video' || !row.videoUrl || row.videoFile) return row
        if (row.duration && row.posterUrl) return row
        const meta = await fetchVideoMetaFromUrl(row.videoUrl)
        if (!meta) return row
        return {
          ...row,
          duration: row.duration || meta.duration || null,
          posterUrl: row.posterUrl || meta.poster || null,
        }
      }))
      return data
    }],
  },
  fields: [
    { name: 'preview', type: 'ui', admin: { position: 'sidebar', components: { Field: './components/admin/PagePreviewField#StoryPreviewField' } } },
    { name: 'heading', label: 'Заголовок', type: 'text', required: true, admin: { hidden: true } },
    { name: 'slug', label: 'Адрес', type: 'text', required: true, unique: true, index: true, admin: { hidden: true }, validate: (value: unknown) => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) ? true : 'Используйте латинские буквы, цифры и дефисы' },
    { name: 'subtitle', label: 'Подзаголовок', type: 'text' },
    // Колонка осталась в БД после ручного поля; не показываем — длительность берётся с видео.
    { name: 'duration', type: 'text', admin: { hidden: true } },
    { name: 'place', label: 'Локация', type: 'text', required: true },
    { name: 'year', label: 'Год', type: 'number', required: true, min: 2014, admin: { step: 1 }, validate: (value: unknown) => typeof value === 'number' && Number.isInteger(value) && value >= 2014 ? true : 'Укажите год' },
    { name: 'customerKind', label: 'Заказчик', type: 'select', required: true, defaultValue: 'family', options: [{ label: 'Частное лицо', value: 'family' }, { label: 'Бизнес', value: 'business' }], admin: { hidden: true } },
    { name: 'binding', label: 'Проект', type: 'select', required: true, defaultValue: 'catalog', options: [{ label: 'Из каталога', value: 'catalog' }, { label: 'Индивидуальный проект', value: 'individual' }, { label: 'Снят с производства', value: 'discontinued' }] },
    { name: 'project', label: 'Проект каталога', type: 'relationship', relationTo: 'projects', admin: { condition: data => data.binding === 'catalog', description: 'В отзыве автоматически показываются фото, название и характеристики проекта: площадь, этажи, спальни и санузлы. Вместо цены — кнопка «Посмотреть проект».', components: { Field: './components/admin/StoryProjectPicker#StoryProjectPicker' } } },
    {
      name: 'relatedCard', label: 'Карточка под отзывом', type: 'group',
      admin: { condition: data => data.binding === 'individual' || data.binding === 'discontinued', description: 'Можно выключить или задать свои заголовок, текст и фото. Кнопка по умолчанию: для бизнеса «Решения для бизнеса», для частников «Смотреть проекты».' },
      fields: [
        { name: 'enabled', label: 'Показывать карточку', type: 'checkbox', defaultValue: true, admin: { components: { Field: './components/admin/CheckboxField#CheckboxField' } } },
        { name: 'title', label: 'Заголовок', type: 'text' },
        { name: 'text', label: 'Текст', type: 'textarea' },
        { name: 'image', label: 'Изображение карточки', type: 'upload', relationTo: 'media', admin: { description: 'Только для правой плашки под отзывом. Не связано с превью видео.', components: { Field: './components/admin/ProjectImageUpload#ProjectImageUpload' } } },
      ],
    },
    {
      name: 'cover', label: 'Превью отзыва', type: 'upload', relationTo: 'media',
      admin: { description: 'Кадр слева у видео. Если пусто, берётся из ролика.', components: { Field: './components/admin/ProjectImageUpload#ProjectImageUpload' } },
    },
    {
      name: 'media', label: 'Фото и видео', labels: { singular: 'запись', plural: 'Записи' }, type: 'array',
      admin: { className: 'gallery-attachments', initCollapsed: true, components: { beforeInput: [galleryBatch], RowLabel: './components/admin/BuiltRowLabel#BuiltRowLabel' } },
      fields: [
        { name: 'type', label: 'Тип', type: 'select', required: true, defaultValue: 'photo', options: [{ label: 'Фото', value: 'photo' }, { label: 'Видео', value: 'video' }], admin: { hidden: true } },
        { name: 'isPrimary', type: 'checkbox', defaultValue: false, admin: { hidden: true } },
        { name: 'provider', type: 'select', options: [{ label: 'Kinescope', value: 'kinescope' }, { label: 'VK Видео', value: 'vk' }], admin: { hidden: true } },
        { name: 'videoUrl', label: 'Ссылка на видео', type: 'text', validate: (value: unknown, { siblingData }: { siblingData?: { type?: string; videoFile?: unknown } }) => siblingData?.type !== 'video' || siblingData.videoFile || detectBuiltVideo(value) ? true : 'Загрузите видео или вставьте ссылку Kinescope или VK Видео', admin: { hidden: true } },
        { name: 'videoFile', label: 'Файл видео', type: 'upload', relationTo: 'media', admin: { hidden: true } },
        { name: 'duration', label: 'Длительность', type: 'text', admin: { hidden: true } },
        { name: 'posterUrl', label: 'Кадр из видео', type: 'text', admin: { hidden: true } },
        { name: 'photo', label: 'Изображение', type: 'upload', relationTo: 'media', validate: (value: unknown, { siblingData }: { siblingData?: { type?: string; image?: string } }) => siblingData?.type === 'video' || value || siblingData?.image ? true : 'Загрузите фотографию', admin: { components: { Field: './components/admin/ProjectImageUpload#ProjectImageUpload' } } },
        { name: 'image', type: 'text', admin: { hidden: true } },
        { name: 'thumbnail', type: 'ui', admin: { components: { Field: './components/admin/ProjectImageField#ProjectExteriorImage' } } },
        { name: 'caption', label: 'Подпись', type: 'text' },
      ],
    },
  ],
}
