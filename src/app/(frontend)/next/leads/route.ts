import { getPayload } from 'payload'
import { NextRequest, NextResponse } from 'next/server'
import config from '@payload-config'
import { allowLeadAttempt, leadInputSchema } from '../../../../lib/leads'

export async function POST(req: NextRequest): Promise<Response> {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
  if (!allowLeadAttempt(ip)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }

  let json: unknown
  try {
    json = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const parsed = leadInputSchema.safeParse({
    ...(typeof json === 'object' && json ? json : {}),
    consent: (json as { consent?: unknown })?.consent === true,
  })
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid', details: parsed.error.flatten() }, { status: 400 })
  }

  const payload = await getPayload({ config })
  const created = await payload.create({
    collection: 'leads',
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone,
      site: parsed.data.siteId,
      page: parsed.data.pageId,
      projectExternalId: parsed.data.projectExternalId,
      sourcePath: parsed.data.sourcePath,
    },
    overrideAccess: true,
  })

  return NextResponse.json({ id: created.id })
}
