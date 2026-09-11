import type { Metadata } from 'next'
import { InfoPage } from '../../components/info-page'
import { copy } from '../../lib/copy'

export const metadata: Metadata = {
  title: copy.businessTitle,
  description: copy.businessLead,
}

export default function BusinessPage() {
  return <InfoPage eyebrow={copy.business} title={copy.businessTitle} lead={copy.businessLead} />
}
