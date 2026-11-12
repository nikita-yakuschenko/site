import { createHmac } from 'node:crypto'
export function passportToken(slug: string, region: string, receipt: string, expires: string, browserGrant = '', mode: 'real' | 'joke' = 'real') {
  if (!process.env.CMS_SITE_API_KEY) throw new Error('passport-signing-not-configured')
  return createHmac('sha256', process.env.CMS_SITE_API_KEY).update(`passport:${slug}:${region}:${receipt}:${expires}:${browserGrant}:${mode}`).digest('hex')
}
