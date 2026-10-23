import { test, expect } from '@playwright/test'

test('сервер сразу выводит назначенный номер Roistat и соответствующий tel', async ({ request }) => {
  const data = encodeURIComponent(JSON.stringify([{ phone: '+7 (831) 200-38-67', replaceable_numbers: ['78312666645'] }]))
  const response = await request.get('/', { headers: { cookie: `roistat_visit=123456; roistat_call_tracking=1; roistat_phone_script_data=${data}` } })
  expect(response.ok()).toBe(true)
  const html = await response.text()
  const headerPhone = html.match(/class="site-header__phone"[^>]*>[\s\S]*?<\/a>/)?.[0]
  expect(headerPhone).toContain('200-38-67')
  expect(headerPhone).toContain('tel:+78312003867')
  expect(headerPhone).not.toContain('266-66-45')
})
