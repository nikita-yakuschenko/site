import { defineConfig, devices } from '@playwright/test'

const production = process.env.DIAG_TARGET === 'production'
const baseURL = production ? 'https://avgst.ru' : process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000'

export default defineConfig({
  testDir: './diagnostics',
  timeout: 90_000,
  expect: { timeout: 12_000 },
  workers: 2,
  retries: 0,
  outputDir: 'diagnostics-results/artifacts',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'diagnostics-results/html', open: 'never' }],
    ['json', { outputFile: 'diagnostics-results/results.json' }],
    ['./diagnostics/reporter.ts'],
  ],
  use: {
    baseURL,
    actionTimeout: 12_000,
    navigationTimeout: 20_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox-desktop', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit-desktop', use: { ...devices['Desktop Safari'] } },
    { name: 'chromium-mobile', use: { ...devices['Pixel 7'] } },
    { name: 'webkit-mobile', use: { ...devices['iPhone 13'] } },
  ],
  webServer: production ? undefined : {
    command: 'node scripts/start-diagnostic-server.mjs',
    url: baseURL + '/api/health',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
