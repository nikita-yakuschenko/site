import type { Project } from '../payload-types'

// The catalogue displays the standard NN price, not hidden starting/dealer prices.
export function catalogPrice(project: Project, importedPrice?: number | null) {
  return project.recordType === 'ready-home'
    ? project.readyHome?.salePrice
    : importedPrice ?? project.configurations?.find(row => row.key === 'standard')?.price ?? project.priceAmount
}
