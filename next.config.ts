import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Сборка в самодостаточный сервер: в образ едет только то, что нужно рантайму.
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
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
}

export default nextConfig
