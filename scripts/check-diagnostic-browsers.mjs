import { chromium, firefox, webkit } from '@playwright/test'
for (const [name, browserType] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await browserType.launch()
  try { console.log(`${name}: ${browser.version()} launch OK`) }
  finally { await browser.close() }
}
