'use client'

import { useField, useFormFields } from '@payloadcms/ui'
import { useState } from 'react'
import { ImagePreviewOverlay, type PreviewImage } from './ImagePreviewOverlay'

export function ProjectThumbnail({ path, siteUrl, uploadPath }: { path: string; siteUrl: string; uploadPath?: string }) {
  const { value } = useField<string>({ path })
  const upload = useFormFields(([fields]) => uploadPath ? fields[uploadPath]?.value : null)
  const [image, setImage] = useState<PreviewImage | null>(null)
  if (!value || upload) return null
  const src = value.startsWith('/') ? `${siteUrl}${value}` : value
  if (!/^https?:\/\//.test(src)) return null
  return <>
    <button type="button" className="project-image-preview-trigger" aria-label="Открыть изображение" onClick={() => setImage({ src, title: 'Просмотр изображения' })}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="project-image-preview" loading="lazy" />
    </button>
    <ImagePreviewOverlay image={image} onClose={() => setImage(null)} />
  </>
}

