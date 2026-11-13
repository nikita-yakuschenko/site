import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))
const config: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.resolve(root, '..'),
  turbopack: { root: path.resolve(root, '..') },
  poweredByHeader: false,
  images: { unoptimized: true },
  reactStrictMode: true,
  serverExternalPackages: ['@whiskeysockets/baileys', 'telegram', 'webmaxsocket', 'qrcode', 'big-integer'],
  async headers() {
    return [
      {
        source: '/api/media/file/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=2592000' }],
      },
      {
        source: '/bitrix/messengers',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'same-origin' },
          { key: 'Content-Security-Policy', value: 'frame-ancestors https://avgstroy.bitrix24.ru' },
        ],
      },
      {
        source: '/bitrix/messengers/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'same-origin' },
          { key: 'Content-Security-Policy', value: 'frame-ancestors https://avgstroy.bitrix24.ru' },
        ],
      },
      {
        source: '/((?!bitrix/messengers).*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'same-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ]
  },
}

export default withPayload(config)
