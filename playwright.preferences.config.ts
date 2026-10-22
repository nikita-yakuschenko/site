import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e', testMatch: 'project-preferences.spec.ts', timeout: 60_000, workers: 1,
  use: { baseURL: 'http://localhost:3014', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    { command: 'node e2e/fixtures/preferences-cms.mjs', url: 'http://127.0.0.1:3015/health', reuseExistingServer: false },
    { command: 'node node_modules/next/dist/bin/next dev -H localhost -p 3014', url: 'http://localhost:3014/catalog', reuseExistingServer: false, timeout: 120_000,
      env: { CMS_PUBLIC_URL: 'http://127.0.0.1:3015', CMS_SITE_API_KEY: 'ao03-synthetic-browser-key-at-least-32-characters', OPTIMIZATION_ENABLED: 'true', OPTIMIZATION_PREFERENCES_ENABLED: 'true', OPTIMIZATION_PREFERENCES_SECRET: 'ao03-synthetic-browser-secret-at-least-32-characters' } },
  ],
})
