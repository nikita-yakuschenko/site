import type { Metadata } from 'next'
import { InfoPage } from '../../components/info-page'
import { copy } from '../../lib/copy'

export const metadata: Metadata = {
  title: copy.expositionTitle,
  description: copy.expositionLead,
}

export default function ExpositionPage() {
  return (
    <InfoPage
      eyebrow={copy.exposition}
      title={copy.expositionTitle}
      lead={copy.expositionLead}
      cta={copy.factoryTour}
    />
  )
}
