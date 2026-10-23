import { test, expect } from '@playwright/test'

test('каркасная технология доступна отдельным фильтром каталога', async ({ page }) => {
  await page.goto('/catalog?tech=frame')
  const filter = page.getByRole('checkbox', { name: 'Каркасная', exact: true }).first()
  await expect(filter).toBeChecked()
  await expect(page.getByRole('checkbox', { name: 'Панельно-каркасная', exact: true }).first()).not.toBeChecked()
  await expect(page.getByRole('checkbox', { name: 'Модульная', exact: true }).first()).not.toBeChecked()
  await filter.click()
  await expect(page).toHaveURL(/\/catalog$/, { timeout: 30_000 })
  await expect(filter).not.toBeChecked()
  await filter.click()
  await expect(page).toHaveURL(/\/catalog\?tech=frame$/, { timeout: 30_000 })
  await expect(filter).toBeChecked()
})
