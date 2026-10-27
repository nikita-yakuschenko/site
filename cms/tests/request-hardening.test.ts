import test from 'node:test'
import assert from 'node:assert/strict'
import {readJsonLimited,RequestLimitError} from '../../src/lib/request-security'
import {requestIdentity,requirePublicRequestLimit} from '../../src/lib/request-limits'
import {leadInputSchema} from '../../src/lib/leads'
import {webhookEventKey} from '../src/automation/webhook-key'
import {checkRequestLimit} from '../src/config/request-limits'
import {validateWorkbookArchive} from '../src/config/workbook-limits'
import {safeRequestError} from '../src/config/safe-request-error'

test('bounded JSON rejects both declared and streamed oversize bodies',async()=>{
 const make=(body:string,headers:HeadersInit={})=>new Request('https://site.test',{method:'POST',headers,body})
 await assert.rejects(readJsonLimited(make('{}',{'content-length':'100'}),10),(e:unknown)=>e instanceof RequestLimitError&&e.status===413)
 await assert.rejects(readJsonLimited(make(JSON.stringify('x'.repeat(20))),10),(e:unknown)=>e instanceof RequestLimitError&&e.status===413)
 assert.deepEqual(await readJsonLimited(make('{"a":1}'),10),{a:1})
 await assert.rejects(readJsonLimited(make('{'),10),(e:unknown)=>e instanceof RequestLimitError&&e.status===400)
})
test('lead metadata rejects excess depth, keys and long content',()=>{
 const lead={name:'Иван',phone:'+79999999999',siteId:1,consent:true}
 assert.ok(leadInputSchema.safeParse({...lead,meta:{email:'ivan@example.test',amount:100}}).success)
 for(const meta of [{content:'x'.repeat(17000)},{a:{b:{c:{d:{e:{f:1}}}}}},Object.fromEntries(Array.from({length:51},(_,i)=>['k'+i,i]))])assert.equal(leadInputSchema.safeParse({...lead,meta}).success,false)
})
test('shared rate guard does not trust spoofed first-hop IP and fails closed',async()=>{
 const a=new Request('https://site.test',{headers:{'x-forwarded-for':'1.1.1.1, 2.2.2.2'}})
 const b=new Request('https://site.test',{headers:{'x-forwarded-for':'9.9.9.9, 2.2.2.2'}})
 assert.equal(requestIdentity(a,'secret'),requestIdentity(b,'secret'))
 const previous=process.env.CMS_SITE_API_KEY;process.env.CMS_SITE_API_KEY='test-key'
 try{
  await assert.rejects(requirePublicRequestLimit(a,'views',async()=>new Response('{}',{status:429})),(e:unknown)=>e instanceof RequestLimitError&&e.status===429)
  await assert.rejects(requirePublicRequestLimit(a,'views',async()=>{throw new Error('down')}),(e:unknown)=>e instanceof RequestLimitError&&e.status===503)
  await requirePublicRequestLimit(a,'views',async(_url,init)=>{assert.equal(JSON.parse(String(init?.body)).identity,requestIdentity(a,'test-key'));return new Response('{}')})
 }finally{if(previous===undefined)delete process.env.CMS_SITE_API_KEY;else process.env.CMS_SITE_API_KEY=previous}
})
test('database rate limits deny exhausted atomic counters',async()=>{
 const payload={db:{drizzle:{execute:async()=>({rows:[]})}}}
 await assert.rejects(checkRequestLimit(payload as never,'views','a'.repeat(64)),(e:unknown)=>e instanceof RequestLimitError&&e.status===429)
})
test('webhook duplicate key is stable across key ordering and changes for newer event timestamps',()=>{
 const a=webhookEventKey('dmp','ONCRMDEALUPDATE','1',{ts:1,a:2,b:3})
 assert.equal(a,webhookEventKey('dmp','ONCRMDEALUPDATE','1',{b:3,a:2,ts:1}))
 assert.notEqual(a,webhookEventKey('dmp','ONCRMDEALUPDATE','1',{ts:2,a:2,b:3}))
})
test('errors do not disclose raw messages or secrets',async()=>{
 let log:unknown
 const r=safeRequestError(new Error('postgresql://user:secret@internal/table'),value=>{log=value})
 const text=await r.text();assert.doesNotMatch(text,/secret|postgresql|internal/);assert.doesNotMatch(JSON.stringify(log),/secret|postgresql/)
})
test('archive validation rejects non-ZIP and unsafe declared inflated sizes before Excel parsing',()=>{
 assert.throws(()=>validateWorkbookArchive(Buffer.from('not xlsx')))
 const zip=Buffer.alloc(22);zip.writeUInt32LE(0x06054b50)
 assert.throws(()=>validateWorkbookArchive(zip))
})


test('workbook preflight bounds sparse coordinates before loading ExcelJS',async()=>{
 const ExcelJS=(await import('exceljs')).default
 const workbook=new ExcelJS.Workbook(),sheet=workbook.addWorksheet('Prices')
 sheet.getCell('A10001').value='oversized sparse sheet'
 const buffer=Buffer.from(await workbook.xlsx.writeBuffer())
 assert.throws(()=>validateWorkbookArchive(buffer))
})
