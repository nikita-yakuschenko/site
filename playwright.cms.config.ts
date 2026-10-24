import { defineConfig, devices } from '@playwright/test'
export default defineConfig({
  testDir: './e2e', testMatch: 'cms-automation.spec.ts', timeout: 90000, workers: 1,
  use: { baseURL: process.env.CMS_UI_TEST_URL || 'http://localhost:3002', trace: 'retain-on-failure' },
  projects: [{ name: 'cms-chromium', use: { ...devices['Desktop Chrome'], channel: 'chrome' } }],
})
