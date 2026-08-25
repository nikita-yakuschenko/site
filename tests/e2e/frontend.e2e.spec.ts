import { test, expect } from '@playwright/test'

test.describe('Frontend', () => {
  test('homepage or unpublished path responds', async ({ page }) => {
    const response = await page.goto('http://localhost:3000')
    expect([200, 404]).toContain(response?.status())
  })
})
