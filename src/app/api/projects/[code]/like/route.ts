import { handlePreferenceRequest } from '../../../../../lib/optimization/preferences-server'
export const dynamic = 'force-dynamic'
export async function PUT(request: Request, { params }: { params: Promise<{ code: string }> }) {
  return handlePreferenceRequest(request, 'set', (await params).code)
}
