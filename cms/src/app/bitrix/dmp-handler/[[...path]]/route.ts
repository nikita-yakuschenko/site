import { POST as handlePost } from '../../../api/automation/[action]/route'
export const dynamic = 'force-dynamic'
type Context = { params: Promise<{ path?: string[] }> }
export async function GET(_request: Request, context: Context) {
  const { path } = await context.params
  return path?.join('/') === 'health' ? Response.json({ status: 'ok', service: 'cms-automation' }) : Response.json({ error: 'Не найдено' }, { status: 404 })
}
export async function POST(request: Request, context: Context) {
  const { path } = await context.params
  if (path?.length && path.join('/') !== 'bitrix/events') return Response.json({ error: 'Не найдено' }, { status: 404 })
  return handlePost(request, { params: Promise.resolve({ action: 'dmp' }) })
}
