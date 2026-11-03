import { expect, test } from '@playwright/test'

test('CMS preview displays the linked catalogue card with facts and a project button', async ({ page }) => {
  await page.route('http://localhost:3001/story-card-test', route => route.fulfill({ contentType: 'text/html', body: '<html><body style="margin:0"><iframe id="preview" src="http://localhost:3000/stories?cmsPreview=1" style="width:100%;height:100vh;border:0"></iframe></body></html>' }))
  await page.goto('http://localhost:3001/story-card-test')
  const preview = page.frameLocator('#preview')
  await expect(preview.getByRole('button', { name: 'Смотреть истории', exact: true })).toBeVisible()
  const draft = { slug: 'test-catalog-story', heading: 'Опыт владельцев', subtitle: 'Отзыв о доме', place: 'Нижний Новгород', year: 2026, kind: 'family', catalogMark: null, poster: '/media/reviews/story-57.jpg', duration: '', id: 'draft:test', card: { enabled: true, title: 'Шведский 161', text: '', image: '/catalog/shvedskii-161/00.jpg', href: '/catalog/shvedskii-161', project: { area: 161, floors: 1, bedrooms: 4, bathrooms: 2 } } }
  // Send through the real, origin-checked parent → preview channel.
  await expect(async () => {
    await page.evaluate(draft => (document.querySelector('#preview') as HTMLIFrameElement).contentWindow!.postMessage({ type: 'avgst:preview-story', story: draft }, 'http://localhost:3000'), draft)
    await expect(preview.locator('#story-test-catalog-story')).toBeVisible()
  }).toPass()
  const story = preview.locator('#story-test-catalog-story')
  await expect(story.getByRole('heading', { name: 'Шведский 161' })).toBeVisible()
  await expect(story.getByRole('list', { name: 'Характеристики проекта' })).toContainText('161 м²')
  await expect(story.getByRole('list', { name: 'Характеристики проекта' }).getByRole('listitem')).toHaveCount(4)
  await expect(story.getByRole('link', { name: 'Посмотреть проект', exact: true })).toHaveAttribute('href', '/catalog/shvedskii-161')
  await expect(story).not.toContainText('руб.')
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 })
    const metrics = await story.evaluate(element => { const image = element.querySelector('a[aria-label="Шведский 161"]')!.getBoundingClientRect(); const title = element.querySelector('h3:last-of-type'); return { image: image.width, width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, title: !!title } })
    expect(metrics.image).toBeGreaterThan(0)
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.width)
    await story.screenshot({ path: `output/stories/catalog-card-${width}.png` })
  }
})
