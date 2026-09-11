import type { Metadata } from 'next'
import { InfoPage } from '../../components/info-page'
import { copy } from '../../lib/copy'

export const metadata: Metadata = {
  title: copy.builtHousesTitle,
  description: copy.builtHousesLead,
}

export default function BuiltHousesPage() {
  return (
    <InfoPage
      eyebrow={copy.builtHouses}
      title={copy.builtHousesTitle}
      lead={copy.builtHousesLead}
      cta={copy.consult}
    />
  )
}
