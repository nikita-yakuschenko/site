import { createHash } from 'node:crypto'
function canonical(value: unknown): unknown {
 if(Array.isArray(value))return value.map(canonical)
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>[key,canonical(item)]))
 return value
}
export function webhookEventKey(action:string,event:string,id:string,raw:Record<string,unknown>,now=Date.now()){
 // Bitrix repeats the original ts when redelivering. Without it, deduplicate
 // identical notifications for five minutes without suppressing future edits.
 const stamp=String(raw.ts||raw.timestamp||Math.floor(now/300000))
 return `${action}:${id}:${createHash('sha256').update(JSON.stringify([event,stamp,canonical(raw)])).digest('hex')}`
}
