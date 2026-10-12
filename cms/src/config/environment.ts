export function readEnvironment(env: NodeJS.ProcessEnv = process.env) {
  const databaseURL = env.DATABASE_URL
  const secret = env.PAYLOAD_SECRET
  const publicURL = env.CMS_PUBLIC_URL
  if (!databaseURL || !/^postgres(?:ql)?:\/\//.test(databaseURL)) {
    throw new Error('DATABASE_URL must point to the separate CMS PostgreSQL database')
  }
  if (!secret || secret.length < 32) {
    throw new Error('PAYLOAD_SECRET must contain at least 32 characters')
  }
  if (!publicURL) throw new Error('CMS_PUBLIC_URL is required')
  const url = new URL(publicURL)
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('CMS_PUBLIC_URL must be an HTTP(S) origin without credentials or a path')
  }
  const production = env.NODE_ENV === 'production'
  if (production && url.protocol !== 'https:') throw new Error('Production CMS_PUBLIC_URL requires HTTPS')
  return {
    databaseURL, secret, publicURL: url.origin, production,
    mediaDir: env.CMS_MEDIA_DIR || './media',
    uploadsEnabled: !production || (env.CMS_MEDIA_PERSISTENT === 'true' && Boolean(env.CMS_MEDIA_DIR?.startsWith('/'))),
  }
}
