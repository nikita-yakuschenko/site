import type { Metadata } from 'next'
import { InfoPage } from '../../components/info-page'
import { copy } from '../../lib/copy'

export const metadata: Metadata = {
  title: copy.dealersTitle,
  description: copy.dealersLead,
}

export default function DealersPage() {
  return <InfoPage eyebrow={copy.dealers} title={copy.dealersTitle} lead={copy.dealersLead} cta={copy.dealersCta} />
}
