import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {checkStaffPassword} from '../src/access/password-policy'
const validation = (text:string)=>(error:unknown)=>{const e=error as {data?:{errors?:{message?:string}[]}};assert.match(e.data?.errors?.[0]?.message||'',new RegExp(text));return true}
const password='Cedar orchard winter lantern 2026'
test('staff passwords enforce length before calling external service',async()=>{
 for(const value of ['abc','x'.repeat(129),null])await assert.rejects(checkStaffPassword(value,async()=>{throw new Error('must not call')}),validation('16'))
})
test('password breach check sends only digest prefix and rejects breached or unavailable checks',async()=>{
 const digest=createHash('sha1').update(password).digest('hex').toUpperCase()
 await assert.rejects(checkStaffPassword(password,async(input,init)=>{
  assert.equal(input,`https://api.pwnedpasswords.com/range/${digest.slice(0,5)}`)
  assert.equal(init?.body,undefined);assert.equal((init?.headers as Record<string,string>)['Add-Padding'],'true')
  return new Response(`${digest.slice(5)}:10\r\n${'0'.repeat(35)}:0`)
 }),validation('утечек'))
 await checkStaffPassword(password,async()=>new Response(`${'0'.repeat(35)}:0`))
 await assert.rejects(checkStaffPassword(password,async()=>new Response('unavailable',{status:503})),validation('недоступна'))
 await assert.rejects(checkStaffPassword(password,async()=>new Response('broken')),validation('недоступна'))
})

test('user hook checks weak authorized passwords but allows ordinary profile edits',async()=>{
 const {Users}=await import('../src/collections/Users')
 const hook=Users.hooks!.beforeOperation![0]
 const req={context:{},user:{collection:'users',id:1},payload:{findByID:async()=>({id:1,role:'admin',isBlocked:false})}}
 await assert.rejects(async()=>hook({operation:'update',args:{data:{password:'abc'}},req} as never),validation('16'))
 const args={data:{firstName:'Имя',password:''}}
 assert.equal(await hook({operation:'update',args,req} as never),args)
 assert.equal(await hook({operation:'update',args:{data:{password:'abc'}},req:{context:{},user:null}} as never) instanceof Object,true)
})
