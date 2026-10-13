import type { UIFieldServerProps } from 'payload'
import { ProjectThumbnail } from './ProjectImage'

const siteURL = () => process.env.SITE_PUBLIC_URL || (process.env.NODE_ENV === 'production' ? 'https://new.avgst.ru' : 'http://localhost:3000')
export function ProjectImage({ path }: UIFieldServerProps) {
  return <ProjectThumbnail path={`${path.slice(0, path.lastIndexOf('.'))}.image`} siteUrl={siteURL()} />
}
export function ProjectHeroImage() { return <ProjectThumbnail path="imageUrl" uploadPath="desktopImage" siteUrl={siteURL()} /> }
export function ProjectMobileHeroImage() { return <ProjectThumbnail path="mobileImageUrl" uploadPath="mobileImage" siteUrl={siteURL()} /> }
export function ProjectExteriorImage({ path }: UIFieldServerProps) {
  const row = path.slice(0, path.lastIndexOf('.'))
  return <ProjectThumbnail path={`${row}.image`} uploadPath={`${row}.photo`} siteUrl={siteURL()} />
}
