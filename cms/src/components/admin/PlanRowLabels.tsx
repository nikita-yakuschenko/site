'use client'
import { useRowLabel } from '@payloadcms/ui'
export function PlanVariantRowLabel() {
  const { data, rowNumber } = useRowLabel<{ label?: string }>()
  return <span>{data?.label?.trim() || `Вариант ${(rowNumber ?? 0) + 1}`}</span>
}
export function PlanFloorRowLabel() {
  const { data, rowNumber } = useRowLabel<{ label?: string }>()
  return <span>{data?.label?.trim() || `${(rowNumber ?? 0) + 1} этаж`}</span>
}
