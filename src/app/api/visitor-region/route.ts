import { resolveIPRegion } from '../../../server/ip-region'

export async function GET(request: Request) {
  const region = await resolveIPRegion(request.headers)
  return Response.json({ region }, { headers: { 'Cache-Control': 'private, no-store' } })
}
