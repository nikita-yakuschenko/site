import { draftMode } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest): Promise<Response> {
  const draft = await draftMode()
  draft.disable()
  const url = new URL('/', req.url)
  return NextResponse.redirect(url)
}
