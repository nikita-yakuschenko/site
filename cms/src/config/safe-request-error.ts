import { randomUUID } from 'node:crypto'
import { RequestLimitError } from '../../../src/lib/request-security'
export function safeRequestError(error: unknown, report: (data: Record<string, unknown>) => void) {
 if (error instanceof RequestLimitError) return Response.json({error:error.code},{status:error.status,headers:{'Cache-Control':'no-store',...(error.status===429?{'Retry-After':'60'}:{})}})
 const requestId=randomUUID()
 report({requestId,failure:error instanceof Error?error.name:'Error',msg:'Request failed; internal error details withheld'})
 return Response.json({error:'Не удалось выполнить запрос.',requestId},{status:400,headers:{'Cache-Control':'no-store'}})
}
