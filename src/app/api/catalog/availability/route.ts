import { NextResponse } from 'next/server'
import { CmsCatalogProvider } from '../../../../lib/catalog/cms-provider'
import { SITE } from '../../../../lib/site'

export const dynamic = 'force-dynamic'

const catalog = new CmsCatalogProvider()

export async function GET() {
  const { items } = await catalog.list({ siteCode: SITE.code })
  return NextResponse.json({ readyHouses: items.some(item => Boolean(item.readyHome)) }, { headers: { 'Cache-Control': 'no-store' } })
}
