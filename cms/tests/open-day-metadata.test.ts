import assert from 'node:assert/strict'
import test from 'node:test'
import { openDayMetadata, openDayShareContent } from '../../src/lib/open-day-metadata'
import type { ContentRecord } from '../../src/lib/cms/react-content'

test('open-day shares use the scoped CMS heading/photo, event date, and versioned landscape card', () => {
  const records: ContentRecord[] = [
    { key: 'FactoryOpenDayHero', parts: [{ key: 'old', title: 'Заголовок: Старый', text: 'Старый заголовок' }] },
    { key: 'FactoryOpenDayHero-page-26', scope: '/factory-open-day', parts: [
      { key: 'a', title: 'Заголовок: Новый взгляд', text: 'Новый взгляд' },
      { key: 'b', title: 'Заголовок: на загородный дом', text: 'на загородный дом' },
      { key: 'logo', image: '/logo.svg', originalImage: 'https://new.avgst.ru/factory-open-day/logo.svg' },
      { key: 'photo', image: 'https://cms.avgst.ru/api/media/file/house.webp', originalImage: 'https://new.avgst.ru/factory-open-day/hero.webp' },
    ] },
  ]
  assert.deepEqual(openDayShareContent(records), { heading: 'Новый взгляд на загородный дом', image: 'https://cms.avgst.ru/api/media/file/house.webp' })
  const metadata = openDayMetadata('14 ноября', records)
  assert.equal(metadata.title, 'Новый взгляд на загородный дом — 14 ноября')
  assert.equal(metadata.openGraph?.title, metadata.title)
  assert.equal(metadata.twitter?.title, metadata.title)
  assert.match(JSON.stringify(metadata), /summary_large_image/)
  assert.doesNotMatch(JSON.stringify(metadata), /сентябр|12 сентября|под ключ/)
  const images = metadata.openGraph?.images
  assert.match(JSON.stringify(images), /factory-open-day\/og\?v=/)
  assert.notDeepEqual(openDayMetadata('21 ноября', records).openGraph?.images, images)
  assert.notDeepEqual(openDayMetadata('14 ноября', [{ ...records[1], parts: records[1].parts.map(part => part.key === 'photo' ? { ...part, image: '/new-photo.webp' } : part) }]).openGraph?.images, images)
})
