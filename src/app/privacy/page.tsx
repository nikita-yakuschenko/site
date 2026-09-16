import type { Metadata } from 'next'
import { InfoPage } from '../../components/info-page'
import { copy } from '../../lib/copy'

export const metadata: Metadata = {
  title: copy.privacyTitle,
  description: copy.privacyLead,
}

export default function PrivacyPage() {
  return (
    <InfoPage
      eyebrow={copy.privacy}
      title={copy.privacyTitle}
      lead={copy.privacyLead}
    />
  )
}
