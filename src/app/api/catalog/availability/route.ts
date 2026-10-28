import { NextResponse } from 'next/server'
import { CmsCatalogProvider } from '../../../../lib/catalog/cms-provider'
import { SITE } from '../../../../lib/site'
import { isCMSUnavailable } from '../../../../server/cms-request'

export const dynamic = 'force-dynamic'

const catalog = new CmsCatalogProvider()

export async function GET() {
  try {
    const { items } = await catalog.list({ siteCode: SITE.code })
    return NextResponse.json({ readyHouses: items.some(item => Boolean(item.readyHome)) }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (!isCMSUnavailable(error)) throw error
    return NextResponse.json({ error: 'catalog-unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '5' } })
  }
}
