import type { CollectionConfig } from 'payload'
import { authorizeSiteRequest } from './project-hero-endpoint'
import { readJsonLimited } from '../../../src/lib/request-security'
import { requestFailure, requestPolicies, type RequestScope } from '../../../src/lib/request-limits'
import { checkRequestLimit } from '../config/request-limits'
export const RequestLimits: CollectionConfig = {
  slug: 'request-limits', admin: { hidden: true }, timestamps: false, lockDocuments: false,
  access: { read:()=>false,create:()=>false,update:()=>false,delete:()=>false },
  fields: [
    {name:'key',type:'text',required:true,unique:true},
    {name:'hits',type:'number',required:true},
    {name:'expiresAt',type:'date',required:true,index:true},
  ],
  endpoints:[{path:'/check',method:'post',handler:async req=>{
    const denied=authorizeSiteRequest(req);if(denied)return denied
    try {
      const body=await readJsonLimited(req,1024) as {scope?:string;identity?:string}
      if(!body||!Object.hasOwn(requestPolicies,body.scope||'')||typeof body.identity!=='string'||!/^[a-f0-9]{64}$/.test(body.identity))return Response.json({error:'invalid-input'},{status:400})
      await checkRequestLimit(req.payload,body.scope as RequestScope,body.identity)
      return Response.json({allowed:true},{headers:{'Cache-Control':'no-store'}})
    }catch(error){return requestFailure(error)}
  }}],
}
