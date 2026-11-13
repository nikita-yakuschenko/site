import { getPayload } from 'payload'
import config from '../../../payload.config'
import { readInboundFile, verifyInboundFile } from '../../../messengers/inbound-file'

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const key = params.get('key') || ''
  if (!verifyInboundFile(key, Number(params.get('expires')), params.get('sig') || '')) return new Response(null, { status: 404 })
  const payload = await getPayload({ config })
  const { docs } = await payload.find({ collection: 'automation-jobs', where: { key: { equals: key } }, limit: 1, depth: 0, overrideAccess: true })
  const job = docs[0]
  const file = job?.kind === 'messenger-inbound' ? readInboundFile(job.data as Record<string, unknown>) : null
  if (!file) return new Response(null, { status: 404 })
  return new Response(new Uint8Array(Buffer.from(file.content, 'base64')), {
    headers: {
      'Content-Type': file.mime,
      'Content-Disposition': "attachment; filename*=UTF-8''" + encodeURIComponent(file.name),
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
