import type { PayloadRequest } from 'payload'
import { getPayload } from 'payload'
import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import { NextRequest } from 'next/server'
import configPromise from '@payload-config'
import { isPreviewSecretValid } from '../../../../lib/preview'

export async function GET(req: NextRequest): Promise<Response> {
  const payload = await getPayload({ config: configPromise })
  const { searchParams } = new URL(req.url)
  const path = searchParams.get('path')
  const previewSecret = searchParams.get('previewSecret')

  if (!isPreviewSecretValid(previewSecret)) {
    return new Response('Нет доступа к предпросмотру этой страницы', { status: 403 })
  }
  if (!path) {
    return new Response('Недостаточно параметров запроса', { status: 404 })
  }
  if (!path.startsWith('/')) {
    return new Response('Предпросмотр доступен только для относительных адресов', { status: 500 })
  }

  let user
  try {
    const authResult = await payload.auth({
      req: req as unknown as PayloadRequest,
      headers: req.headers,
    })
    user = authResult.user
  } catch (error) {
    payload.logger.error({ err: error }, 'Ошибка проверки токена предпросмотра')
    return new Response('Нет доступа к предпросмотру этой страницы', { status: 403 })
  }

  const draft = await draftMode()
  if (!user) {
    draft.disable()
    return new Response('Нет доступа к предпросмотру этой страницы', { status: 403 })
  }

  draft.enable()
  redirect(path)
}
