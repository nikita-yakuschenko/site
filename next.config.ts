import type { NextConfig } from 'next'
import webpAssets from './src/data/webp-assets.json'
import { existsSync, readFileSync } from 'node:fs'

const identity = process.env.NODE_ENV === 'production' && existsSync('build/identity.json')
  ? JSON.parse(readFileSync('build/identity.json', 'utf8')) as { version: string; commit: string; buildId: string; sourceDirty: boolean | null }
  : null

const nextConfig: NextConfig = {
  // Сборка в самодостаточный сервер: в образ едет только то, что нужно рантайму.
  output: 'standalone',
  reactStrictMode: true,
  ...(process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_PLAN_REQUEST_DEMO === '1' ? { devIndicators: false as const } : {}),
  ...(identity ? { generateBuildId: async () => identity.buildId } : {}),
  // A large shared stylesheet must cache separately: inlineCss duplicates it
  // inside both server HTML and the React Server Component payload.
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
    APP_VERSION: identity?.version ?? process.env.APP_VERSION ?? '0.1.0',
    APP_COMMIT: identity?.commit ?? process.env.APP_COMMIT ?? 'unknown',
    APP_BUILD_ID: identity?.buildId ?? 'unknown',
    APP_SOURCE_DIRTY: identity?.sourceDirty == null ? 'unknown' : String(identity.sourceDirty),
  },
  // CMS uploads retain their originals; cache resized versions for each screen.
  images: {
    deviceSizes: [640, 750, 828, 1080, 1200, 1280, 1920, 2048, 2560, 3840],
    qualities: [45, 60, 75, 80, 85, 90, 100],
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
  async rewrites() {
    // Internal image requests must receive image bytes, not an HTTP redirect.
    return Object.entries(webpAssets as Record<string, string>).map(([source, destination]) => ({
      source: source.replace(/[()+*?:{}\\]/g, '\\$&'), destination,
    }))
  },
  async redirects() {
    return [
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
