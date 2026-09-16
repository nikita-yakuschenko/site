import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Сборка в самодостаточный сервер: в образ едет только то, что нужно рантайму.
  output: 'standalone',
  reactStrictMode: true,
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
  // Политики и правила в корне; старые /legal/* и /personal-data → редирект.
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
