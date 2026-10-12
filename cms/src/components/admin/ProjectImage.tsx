'use client'

import { useField } from '@payloadcms/ui'

export function ProjectThumbnail({ path, siteUrl }: { path: string; siteUrl: string }) {
  const { value } = useField<string>({ path })
  if (!value) return null
  const src = value.startsWith('/') ? `${siteUrl}${value}` : value
  if (!/^https?:\/\//.test(src)) return null
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" className="project-image-preview" loading="lazy" />
}

