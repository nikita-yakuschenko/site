'use client'

import { useMemo, useState } from 'react'
import { TranslationProvider, UploadField, useTranslation } from '@payloadcms/ui'
import type { UploadFieldClientProps } from 'payload'
import type { AcceptedLanguages } from '@payloadcms/translations'
import { ImagePreviewOverlay, type PreviewImage } from './ImagePreviewOverlay'

// Keep Payload's uploader, media picker, edit drawer and remove action intact.
export function ProjectImageUpload(props: UploadFieldClientProps & { imageKind?: 'plan' }) {
  const plan = props.imageKind === 'plan'
  const [image, setImage] = useState<PreviewImage | null>(null)
  const { i18n, languageOptions, switchLanguage } = useTranslation()
  const translations = useMemo(() => ({
    ...i18n.translations,
    general: { ...(typeof i18n.translations.general === 'object' ? i18n.translations.general : {}), createNew: plan ? 'Загрузить планировку' : 'Загрузить фото', or: ' ' },
    fields: { ...(typeof i18n.translations.fields === 'object' ? i18n.translations.fields : {}), chooseFromExisting: 'Выбрать из медиатеки' },
    upload: { ...(typeof i18n.translations.upload === 'object' ? i18n.translations.upload : {}), dragAndDrop: plan ? 'Перетащите планировку сюда\nJPG, PNG, WebP или AVIF' : 'Перетащите фото сюда\nJPG, PNG, WebP или AVIF' },
  }), [i18n.translations, plan])
  return <div className="project-image-upload" onClickCapture={event => {
    if (!(event.target instanceof Element)) return
    const trigger = event.target.closest('.thumbnail, .upload-relationship-details__filename a')
    if (!trigger) return
    const link = trigger.closest('.upload-relationship-details')?.querySelector<HTMLAnchorElement>('.upload-relationship-details__filename a')
    if (!link || !/^https?:\/\//.test(link.href)) return
    event.preventDefault()
    event.stopPropagation()
    setImage({ src: link.href, title: link.textContent || 'Просмотр изображения' })
  }}>
    <TranslationProvider translations={translations} language={i18n.language} fallbackLang={i18n.fallbackLanguage as AcceptedLanguages} dateFNSKey={i18n.dateFNSKey} languageOptions={languageOptions} switchLanguageServerAction={async language => { await switchLanguage?.(language as AcceptedLanguages) }}>
      <UploadField {...props} />
    </TranslationProvider>
    <ImagePreviewOverlay image={image} onClose={() => setImage(null)} />
  </div>
}
