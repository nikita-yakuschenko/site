import assert from 'node:assert/strict'
import test from 'node:test'
import { managedRedirect } from '../../src/lib/managed-redirects'
test('registry edits and deletions expire; CMS outages retain the last rules', async t => {
 let now=1000, calls=0, offline=false
 let rules=[{source:'/catalog/swened-135',target:'/catalog/sweden-135'}]
 t.mock.method(Date,'now',()=>now)
 t.mock.method(globalThis,'fetch',async()=>{calls++;if(offline)throw Error('offline');return Response.json({rules})})
 const source=new URL('https://avgst.ru/catalog/swened-135?yclid=123')
 assert.equal((await managedRedirect(source))?.href,'https://avgst.ru/catalog/sweden-135?yclid=123')
 assert.equal((await managedRedirect(new URL('https://avgst.ru/catalog/modulnye-doma/product/swened-135')))?.pathname,'/catalog/sweden-135')
 assert.equal(calls,1)
 rules=[{source:'/catalog/swened-135',target:'/catalog?tech=modular'}];now+=31000
 assert.equal((await managedRedirect(source))?.href,'https://avgst.ru/catalog?tech=modular&yclid=123')
 offline=true;now+=31000
 assert.equal((await managedRedirect(source))?.pathname,'/catalog')
 offline=false;rules=[{source:'/catalog?tech=panel',target:'/catalog?tech=frame'}];now+=6000
 assert.equal((await managedRedirect(new URL('https://avgst.ru/catalog?utm_source=test&tech=panel')))?.href,'https://avgst.ru/catalog?tech=frame&utm_source=test')
 assert.equal(await managedRedirect(new URL('https://avgst.ru/catalog?tech=frame')),null)
 rules=[];now+=31000
 assert.equal(await managedRedirect(source),null)
})
