import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'
import { readCMSContent } from '../../../lib/cms/content'
import { openDayDate } from '../../../lib/open-day'
import { OPEN_DAY_ROUTE, openDayShareContent } from '../../../lib/open-day-metadata'

export async function GET() {
  const [date, records, font] = await Promise.all([
    openDayDate(),
    readCMSContent(OPEN_DAY_ROUTE),
    readFile(join(process.cwd(), 'public/fonts/inter/Inter-OG-Bold.ttf')),
  ])
  const content = openDayShareContent(records)
  let photo: Buffer
  try {
    const response = await fetch(content.image, { next: { revalidate: 60 }, signal: AbortSignal.timeout(5000) })
    if (!response.ok) throw new Error('Photo unavailable')
    photo = Buffer.from(await response.arrayBuffer())
  } catch {
    photo = await readFile(join(process.cwd(), 'public/factory-open-day/hero.webp'))
  }
  // The OG renderer does not reliably embed WebP; provide a bounded PNG instead.
  const photoPNG = await sharp(photo, { limitInputPixels: 40_000_000 }).resize(420, 630, { fit: 'cover' }).png().toBuffer()
  return new ImageResponse(
    <div style={{ display: 'flex', width: '100%', height: '100%', background: '#0c1020', color: '#fff', fontFamily: 'Inter' }}>
      <div style={{ display: 'flex', flexDirection: 'column', width: 780, padding: '52px 56px' }}>
        <div style={{ display: 'flex', fontSize: 29, color: '#facc00' }}>День открытых дверей</div>
        <div style={{ display: 'flex', fontSize: content.heading.length > 65 ? 46 : 60, fontWeight: 700, lineHeight: 1.1, marginTop: 30 }}>{content.heading}</div>
        <div style={{ display: 'flex', marginTop: 28, fontSize: 25, color: '#c4c6ce' }}>Производство · Выставочные дома</div>
        <div style={{ display: 'flex', marginTop: 'auto', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 37, fontWeight: 700, color: '#facc00' }}>{date}</div>
          <div style={{ display: 'flex', marginTop: 10, fontSize: 23 }}>Нижний Новгород · Бесплатно, по записи</div>
          <div style={{ display: 'flex', marginTop: 24, fontSize: 24, fontWeight: 700 }}>АВАНГАРД СТРОЙ</div>
        </div>
      </div>
      {/* The portrait selected for the first screen keeps its full framing. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`data:image/png;base64,${photoPNG.toString('base64')}`} width={420} height={630} style={{ objectFit: 'cover' }} alt="" />
    </div>,
    { width: 1200, height: 630, fonts: [{ name: 'Inter', data: font, weight: 700, style: 'normal' }], headers: { 'Cache-Control': 'public, max-age=60, s-maxage=60' } },
  )
}
