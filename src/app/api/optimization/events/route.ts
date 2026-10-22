import { handleOptimizationEvents } from '../../../../lib/optimization/events-server'
export const dynamic = 'force-dynamic'
export async function POST(request: Request) { return handleOptimizationEvents(request) }
