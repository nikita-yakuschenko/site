'use client'
import { useRowLabel } from '@payloadcms/ui'
import { floorName, variantName } from '../../config/project-plans'
export function PlanVariantRowLabel() {
  const { rowNumber } = useRowLabel()
  return <span>{variantName(rowNumber ?? 0)}</span>
}
export function PlanFloorRowLabel() {
  const { rowNumber } = useRowLabel()
  return <span>{floorName(null, rowNumber ?? 0)}</span>
}
