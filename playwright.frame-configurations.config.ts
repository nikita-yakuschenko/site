import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './e2e', testMatch: 'frame-configurations.spec.ts', timeout: 90000, workers: 1,
  use: { baseURL: process.env.FRAME_SITE_TEST_URL || 'http://localhost:3003', channel: 'chrome', trace: 'retain-on-failure' },
})
