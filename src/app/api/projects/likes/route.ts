import { handlePreferenceRequest } from '../../../../lib/optimization/preferences-server'
export const dynamic = 'force-dynamic'
export async function GET(request: Request) { return handlePreferenceRequest(request, 'batch') }
