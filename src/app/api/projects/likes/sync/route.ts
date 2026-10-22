import { handlePreferenceRequest } from '../../../../../lib/optimization/preferences-server'
export const dynamic = 'force-dynamic'
export async function POST(request: Request) { return handlePreferenceRequest(request, 'sync') }
