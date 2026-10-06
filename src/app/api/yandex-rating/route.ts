const WIDGET_URL = 'https://yandex.ru/sprav/widget/rating-badge/168967074576?type=rating&theme=light'
const REVIEWS_URL = 'https://yandex.ru/maps/org/168967074576/reviews/'

export async function GET() {
  try {
    const response = await fetch(WIDGET_URL, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(8000) })
    if (!response.ok) throw new Error('Widget unavailable')
    const html = await response.text()
    const encoded = html.match(/data:image\/svg\+xml;utf8,([^'"]+)/)?.[1]
    if (!encoded) throw new Error('Widget format changed')
    const svg = decodeURIComponent(encoded)
    const text = [...svg.matchAll(/<text\b[^>]*>([^<]+)<\/text>/g)].map(match => match[1]?.trim() ?? '')
    const value = text.find(value => /^[0-5][,.]\d+$/.test(value))
    const rating = value ? Number(value.replace(',', '.')) : NaN
    if (!Number.isFinite(rating) || rating < 0 || rating > 5) throw new Error('Invalid rating')
    return Response.json({ rating, href: REVIEWS_URL }, { headers: { 'Cache-Control': 'public, max-age=300, s-maxage=3600' } })
  } catch {
    return Response.json({ rating: null, href: REVIEWS_URL }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
