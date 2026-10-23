import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {transpileModule,ModuleKind,ScriptTarget} from 'typescript';
function load(path:string,modules:Record<string,unknown>){const output={exports:{} as Record<string,(...args:unknown[])=>Promise<unknown>>};const code=transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ModuleKind.CommonJS,target:ScriptTarget.ES2020}}).outputText;new Function('require','module','exports',code)((key:string)=>{if(!(key in modules))throw Error('Unexpected dependency: '+key);return modules[key];},output,output.exports);return output.exports;}
test('Agency account verification requires owned binding, matching account and exact connection epoch before provider access',async()=>{
 for(const changed of ['none','bindingMissing','foreignOwner','account','epoch','expired','providerId','providerUsername']){
  let reads=0;const owner='owner';
  const connection={id:'c',owner_id:changed==='foreignOwner'?'other':owner,account_id:changed==='account'?'999':'123',channel:'instagram',connected_at:changed==='epoch'?'new':'epoch',expires_at:changed==='expired'?'2020-01-01':null,credentials:{}};
  const binding={owner_id:owner,expected_account_id:'123',expected_username:'cole',connection_id:'c',connection_version:'epoch'};
  const db={from(table:string){const filters:Record<string,unknown>={};const q={select(){return q;},eq(k:string,v:unknown){filters[k]=v;return q;},is(){return q;},async maybeSingle(){assert.equal(filters.owner_id,owner,'every service read must scope owner');const row=table.endsWith('bindings')?changed==='bindingMissing'?null:binding:connection.owner_id===owner?connection:null;return {data:row,error:null};}};return q;}};
  const code=load('src/lib/server/agency/store.ts',{'@/lib/supabase/service':{createBeastFusionPublicationClient:()=>db},'@/lib/server/social/auth':{unseal:()=>({access_token:'fixture'})},'@/lib/server/social/providers':{metaRequest:async()=>{reads++;return {id:changed==='providerId'?'999':'123',username:changed==='providerUsername'?'other':'cole'};}}});
  const call=()=>code.agencyAccount(owner,'cole',true);
  if(changed==='none'){await call();assert.equal(reads,1);}else{await assert.rejects(call);if(!changed.startsWith('provider'))assert.equal(reads,0);}
 }
});
test('Agency denies signed-out requests before constructing privileged clients',async()=>{
 let clients=0;
 const modules:Record<string,unknown>={
  '@/lib/server/social/auth':{socialOwner:async()=>null,socialJson:(body:unknown,status:number)=>({body,status})},
  '@/lib/server/agency/auth':{agencyWriteOwner:async()=>null},
  '@/lib/supabase/service':{createBeastFusionPublicationClient:()=>{clients++;throw Error('must not run');}},
  '@/lib/supabase/config':{},'@/lib/server/social/providers':{},'@/lib/server/agency/store':{},'@/lib/server/agency/media':{},'@/lib/agencyWorkflow':{},'@/lib/agencyPreparation':{},'@/lib/marketingSocial':{},
 };
 const route=load('src/app/api/admin/agency/route.ts',modules);
 assert.equal((await route.GET() as {status:number}).status,403);assert.equal((await route.POST(new Request('https://thebeast.seangworld.com/api/admin/agency',{method:'POST'})) as {status:number}).status,403);assert.equal(clients,0);
});
