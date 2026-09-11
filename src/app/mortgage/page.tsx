import type { Metadata } from 'next'
import { InfoPage } from '../../components/info-page'
import { copy } from '../../lib/copy'

export const metadata: Metadata = {
  title: copy.mortgageTitle,
  description: copy.mortgageLead,
}

export default function MortgagePage() {
  return (
    <InfoPage
      eyebrow={copy.mortgage}
      title={copy.mortgageTitle}
      lead={copy.mortgageLead}
      items={copy.mortgagePrograms}
      cta={copy.mortgageCta}
    />
  )
}
