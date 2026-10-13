import { PagePreview } from './PagePreview'
import { ConfigurationBlockEditor } from './ConfigurationBlockEditor'
export function ConfigurationPreviewField({ variant }: { variant: 'panel' | 'modular' }) {
  const siteUrl = process.env.SITE_PUBLIC_URL || (process.env.NODE_ENV === 'production' ? 'https://new.avgst.ru' : 'http://localhost:3000')
  return <ConfigurationBlockEditor siteUrl={siteUrl} variant={variant} />
}
export function PagePreviewField() {
  const siteUrl = process.env.SITE_PUBLIC_URL || (process.env.NODE_ENV === 'production' ? 'https://new.avgst.ru' : 'http://localhost:3000')
  return <PagePreview siteUrl={siteUrl} />
}
export function ProjectPreviewField() {
  const siteUrl = process.env.SITE_PUBLIC_URL || (process.env.NODE_ENV === 'production' ? 'https://new.avgst.ru' : 'http://localhost:3000')
  return <PagePreview siteUrl={siteUrl} project />
}
