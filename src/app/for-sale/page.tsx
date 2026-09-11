import type { Metadata } from 'next'
import { InfoPage } from '../../components/info-page'
import { copy } from '../../lib/copy'

export const metadata: Metadata = {
  title: copy.readyHousesTitle,
  description: copy.readyHousesLead,
}

export default function ForSalePage() {
  return (
    <InfoPage
      eyebrow={copy.readyHouses}
      title={copy.readyHousesTitle}
      lead={copy.readyHousesLead}
      cta={copy.consult}
    />
  )
}
