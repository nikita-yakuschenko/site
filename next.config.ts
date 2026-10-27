import type { NextConfig } from 'next'
import webpAssets from './src/data/webp-assets.json'

const nextConfig: NextConfig = {
  // Сборка в самодостаточный сервер: в образ едет только то, что нужно рантайму.
  output: 'standalone',
  reactStrictMode: true,
  // Deliver first-paint styles with HTML instead of blocking on four CSS requests.
  experimental: { inlineCss: true },
  poweredByHeader: false,
  // Playwright / локальный доступ по 127.0.0.1 к dev-ресурсам Next.
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  // Битрикс дописывает bis_skin_checked в DOM. Next тащит этот hydration в терминал.
  // Расширение остаётся, смотреть живые ошибки браузера — в DevTools.
  logging: {
    browserToTerminal: false,
  },
  // Версия и коммит пробрасываются в /api/health, чтобы понимать, что именно катится.
  env: {
    APP_VERSION: process.env.APP_VERSION ?? '0.1.0',
    APP_COMMIT: process.env.APP_COMMIT ?? 'unknown',
  },
  // Files are encoded at upload/build time and served directly.
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'new.avgst.ru', pathname: '/**' },
      { protocol: 'https', hostname: 'cms.avgst.ru', pathname: '/api/media/file/**' },
      { protocol: 'http', hostname: 'localhost', port: '3001', pathname: '/api/media/file/**' },
    ],
  },
  // Политики и правила в корне; старые /legal/* и /personal-data → редирект.
  async headers() {
    return [{ source: '/generated/webp/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] }]
  },
  async redirects() {
    return [
      ...Object.entries(webpAssets as Record<string, string>).map(([source, destination]) => ({
        source: source.replace(/[()+*?:{}\\]/g, '\\$&'), destination, permanent: true,
      })),
      {
        source: '/legal/cookies',
        destination: '/cookies',
        permanent: true,
      },
      {
        source: '/legal/privacy',
        destination: '/privacy',
        permanent: true,
      },
      {
        source: '/legal/referral',
        destination: '/referral',
        permanent: true,
      },
      {
        source: '/personal-data',
        destination: '/privacy',
        permanent: true,
      },
    ]
  },
}

export default nextConfig
