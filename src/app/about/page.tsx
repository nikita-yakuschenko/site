import type { Metadata } from 'next'
import { InfoPage } from '../../components/info-page'
import { copy } from '../../lib/copy'

export const metadata: Metadata = {
  title: copy.aboutTitle,
  description: copy.aboutLead,
}

export default function AboutPage() {
  return <InfoPage eyebrow={copy.about} title={copy.aboutTitle} lead={copy.aboutLead} />
}
