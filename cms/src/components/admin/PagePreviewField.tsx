import { PagePreview } from './PagePreview'
export function PagePreviewField() {
  const siteUrl = process.env.SITE_PUBLIC_URL || (process.env.NODE_ENV === 'production' ? 'https://new.avgst.ru' : 'http://localhost:3000')
  return <PagePreview siteUrl={siteUrl} />
}
export function ProjectPreviewField() {
  const siteUrl = process.env.SITE_PUBLIC_URL || (process.env.NODE_ENV === 'production' ? 'https://new.avgst.ru' : 'http://localhost:3000')
  return <PagePreview siteUrl={siteUrl} project />
}
