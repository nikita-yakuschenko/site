'use client'
import { useRowLabel } from '@payloadcms/ui'
export function ConfigurationContentRowLabel() {
  const { data, rowNumber } = useRowLabel<{ text?: string; title?: string }>()
  return <span className="configuration-row-label">{data?.text || data?.title || `Новый пункт ${(rowNumber ?? 0) + 1}`}</span>
}
